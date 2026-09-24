REVOKE SELECT ON public.bookings FROM anon;
DROP POLICY "Public reads booking availability" ON public.bookings;

CREATE OR REPLACE FUNCTION public.public_booking_availability(_property_id uuid)
RETURNS TABLE (id uuid, property_id uuid, start_date date, end_date date, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.property_id, b.start_date, b.end_date, b.status
  FROM public.bookings b
  WHERE b.property_id = _property_id AND b.status IN ('CONFIRMED', 'PENDING')
  ORDER BY b.start_date
$$;
GRANT EXECUTE ON FUNCTION public.public_booking_availability(uuid) TO anon, authenticated;