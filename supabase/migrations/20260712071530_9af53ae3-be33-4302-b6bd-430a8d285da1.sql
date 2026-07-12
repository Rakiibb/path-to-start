
REVOKE EXECUTE ON FUNCTION public.current_app_user_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(public.app_role) FROM PUBLIC, anon, authenticated;
