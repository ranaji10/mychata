REVOKE SELECT ON public.accounts FROM anon;
DROP POLICY "Public reads institutional account" ON public.accounts;
REVOKE SELECT ON public.properties FROM anon;
DROP POLICY "Public reads properties" ON public.properties;

CREATE OR REPLACE FUNCTION public.public_property_details(_property_id uuid)
RETURNS TABLE (id uuid, name text, address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.address FROM public.properties p WHERE p.id = _property_id LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.public_institutional_property()
RETURNS TABLE (id uuid, name text, address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.address FROM public.properties p JOIN public.accounts a ON a.id = p.account_id WHERE a.type = 'INSTITUTIONAL' ORDER BY p.created_at LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.public_property_details(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_institutional_property() TO anon, authenticated;