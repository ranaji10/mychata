DROP POLICY "Members can read manual sections" ON public.manual_sections;
DROP POLICY "Members can manage manual sections" ON public.manual_sections;
CREATE POLICY "Members read own manual sections" ON public.manual_sections FOR SELECT TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Admins manage own manual sections" ON public.manual_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') AND property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (public.has_role(auth.uid(), 'admin') AND property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));

DROP POLICY "Members can manage manual feedback" ON public.manual_feedback;
CREATE POLICY "Members manage own manual feedback" ON public.manual_feedback FOR ALL TO authenticated USING (section_id IN (SELECT id FROM public.manual_sections WHERE property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()))) WITH CHECK (section_id IN (SELECT id FROM public.manual_sections WHERE property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())));

DROP POLICY "Members can manage documents" ON public.documents;
CREATE POLICY "Members read own visible documents" ON public.documents FOR SELECT TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()) AND (visibility = 'ALL_MEMBERS' OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Admins manage own documents" ON public.documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') AND property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (public.has_role(auth.uid(), 'admin') AND property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));

DROP POLICY "Members can manage handover issues" ON public.handover_issues;
CREATE POLICY "Members manage own handover issues" ON public.handover_issues FOR ALL TO authenticated USING (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE account_id = public.current_account_id()));

DROP POLICY "Authenticated users can upload My Chata files" ON storage.objects;
DROP POLICY "Authenticated users can read My Chata files" ON storage.objects;
DROP POLICY "Authenticated users can update My Chata files" ON storage.objects;
DROP POLICY "Authenticated users can delete My Chata files" ON storage.objects;
CREATE POLICY "Members upload own cottage files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'my-chata-files' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Members read own cottage files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'my-chata-files' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Members update own cottage files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'my-chata-files' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties WHERE account_id = public.current_account_id())) WITH CHECK (bucket_id = 'my-chata-files' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties WHERE account_id = public.current_account_id()));
CREATE POLICY "Members delete own cottage files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'my-chata-files' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties WHERE account_id = public.current_account_id()));