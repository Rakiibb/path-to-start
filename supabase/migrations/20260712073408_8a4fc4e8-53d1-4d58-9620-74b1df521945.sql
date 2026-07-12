
DROP VIEW IF EXISTS public.user_identities;

CREATE OR REPLACE FUNCTION public.get_user_identities(_ids uuid[])
RETURNS TABLE(id uuid, secret_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.secret_code
  FROM public.users u
  WHERE u.id = ANY(_ids) AND u.secret_code IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_identities(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_identities(uuid[]) TO authenticated;
