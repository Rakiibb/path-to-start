CREATE OR REPLACE FUNCTION public.list_captains_safe()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.full_name
  FROM public.users u
  WHERE u.role = 'captain'
    AND u.full_name IN ('Kudu Kuddus', 'Afsan', 'Abir')
    AND auth.uid() IS NOT NULL
  ORDER BY u.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.list_captains_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_captains_safe() TO service_role;