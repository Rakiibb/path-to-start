GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;