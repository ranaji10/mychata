CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  member_id uuid UNIQUE REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.members ADD COLUMN user_id uuid UNIQUE;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT account_id FROM public.members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.claim_initial_membership()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed_member uuid;
BEGIN
  SELECT member_id INTO claimed_member FROM public.profiles WHERE user_id = auth.uid();
  IF claimed_member IS NOT NULL THEN RETURN claimed_member; END IF;
  UPDATE public.members SET user_id = auth.uid()
  WHERE id = (
    SELECT id FROM public.members
    WHERE user_id IS NULL AND lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    LIMIT 1
  ) RETURNING id INTO claimed_member;
  IF claimed_member IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    UPDATE public.members SET user_id = auth.uid()
    WHERE id = 'c0000000-0000-4000-8000-000000000001' AND user_id IS NULL
    RETURNING id INTO claimed_member;
  END IF;
  IF claimed_member IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.profiles(user_id, member_id) VALUES (auth.uid(), claimed_member) ON CONFLICT (user_id) DO UPDATE SET member_id = excluded.member_id;
  INSERT INTO public.user_roles(user_id, role)
  SELECT auth.uid(), CASE WHEN role IN ('ADMIN','OWNER') THEN 'admin'::public.app_role ELSE 'member'::public.app_role END FROM public.members WHERE id = claimed_member
  ON CONFLICT DO NOTHING;
  RETURN claimed_member;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_initial_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY open_accounts ON public.accounts;
DROP POLICY open_members ON public.members;
DROP POLICY open_properties ON public.properties;
DROP POLICY open_bookings ON public.bookings;
DROP POLICY open_requests ON public.institutional_requests;
DROP POLICY open_tasks ON public.tasks;
DROP POLICY open_expenses ON public.expenses;
DROP POLICY open_splits ON public.expense_splits;
DROP POLICY open_handovers ON public.handovers;

CREATE POLICY "Members read own account" ON public.accounts FOR SELECT TO authenticated USING (id = public.current_account_id());
CREATE POLICY "Public reads institutional account" ON public.accounts FOR SELECT TO anon USING (type = 'INSTITUTIONAL');
CREATE POLICY "Members read account members" ON public.members FOR SELECT TO authenticated USING (account_id = public.current_account_id());
CREATE POLICY "Members update self" ON public.members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members read own properties" ON public.properties FOR SELECT TO authenticated USING (account_id = public.current_account_id());
CREATE POLICY "Public reads properties" ON public.properties FOR SELECT TO anon USING (true);
CREATE POLICY "Members manage own bookings" ON public.bookings FOR ALL TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Public reads booking availability" ON public.bookings FOR SELECT TO anon USING (status IN ('CONFIRMED','PENDING'));
CREATE POLICY "Members manage own requests" ON public.institutional_requests FOR ALL TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Public submits requests" ON public.institutional_requests FOR INSERT TO anon WITH CHECK (status = 'PENDING');
CREATE POLICY "Members manage own tasks" ON public.tasks FOR ALL TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Members manage own expenses" ON public.expenses FOR ALL TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Members manage own expense splits" ON public.expense_splits FOR ALL TO authenticated USING (expense_id IN (SELECT id FROM public.expenses WHERE property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()))) WITH CHECK (expense_id IN (SELECT id FROM public.expenses WHERE property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())));
CREATE POLICY "Members manage own handovers" ON public.handovers FOR ALL TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));