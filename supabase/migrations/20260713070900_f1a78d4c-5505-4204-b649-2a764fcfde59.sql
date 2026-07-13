CREATE OR REPLACE FUNCTION public.captain_complaint_counts()
RETURNS TABLE(captain_id uuid, complaint_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_captain_id, count(*)::bigint
  FROM public.feedback
  WHERE feedback_type = 'Captain'
    AND target_captain_id IS NOT NULL
    AND auth.uid() IS NOT NULL
  GROUP BY target_captain_id;
$$;

REVOKE ALL ON FUNCTION public.captain_complaint_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.captain_complaint_counts() TO authenticated, service_role;