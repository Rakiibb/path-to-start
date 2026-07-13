REVOKE EXECUTE ON FUNCTION public.list_captains_safe() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_captains_safe() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_captains_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_captains_safe() TO service_role;