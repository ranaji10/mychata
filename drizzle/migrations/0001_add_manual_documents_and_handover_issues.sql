CREATE TABLE public.manual_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other',
  title_cs text NOT NULL,
  title_en text NOT NULL,
  content_cs text NOT NULL DEFAULT '',
  content_en text NOT NULL DEFAULT '',
  photo_url text,
  visibility text NOT NULL DEFAULT 'PUBLIC',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sections TO authenticated;
GRANT SELECT ON public.manual_sections TO anon;
GRANT ALL ON public.manual_sections TO service_role;
ALTER TABLE public.manual_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read public manual sections" ON public.manual_sections FOR SELECT TO anon USING (visibility = 'PUBLIC');
CREATE POLICY "Members can read manual sections" ON public.manual_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can manage manual sections" ON public.manual_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.manual_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.manual_sections(id) ON DELETE CASCADE,
  note text,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT INSERT ON public.manual_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_feedback TO authenticated;
GRANT ALL ON public.manual_feedback TO service_role;
ALTER TABLE public.manual_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can flag manual sections" ON public.manual_feedback FOR INSERT TO anon WITH CHECK (status = 'OPEN');
CREATE POLICY "Members can manage manual feedback" ON public.manual_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'OTHER',
  notes text,
  file_url text,
  visibility text NOT NULL DEFAULT 'ALL_MEMBERS',
  issue_date date,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.handover_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id uuid REFERENCES public.handovers(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handover_issues TO authenticated;
GRANT ALL ON public.handover_issues TO service_role;
ALTER TABLE public.handover_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage handover issues" ON public.handover_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handovers_set_updated_at BEFORE UPDATE ON public.handovers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER manual_sections_set_updated_at BEFORE UPDATE ON public.manual_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();