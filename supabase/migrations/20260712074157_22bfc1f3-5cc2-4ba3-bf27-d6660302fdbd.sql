CREATE OR REPLACE FUNCTION public.list_seat_roster()
RETURNS TABLE(
  id uuid,
  full_name text,
  roll_number text,
  secret_code text,
  height_cm int,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.full_name, u.roll_number, u.secret_code, u.height_cm, u.role
  FROM public.users u
  WHERE auth.uid() IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.list_seat_roster() TO authenticated;