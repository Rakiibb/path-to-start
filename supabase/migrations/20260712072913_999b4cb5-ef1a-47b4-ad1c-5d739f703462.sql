
REVOKE EXECUTE ON FUNCTION public.recompute_feedback_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recompute_feedback_status() FROM PUBLIC, anon, authenticated;
