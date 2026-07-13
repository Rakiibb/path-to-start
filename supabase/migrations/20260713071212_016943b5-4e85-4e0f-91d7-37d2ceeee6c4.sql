CREATE OR REPLACE FUNCTION public.list_captain_complaints(_captain_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category text,
  status feedback_status,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.title, f.description, f.category, f.status, f.created_at
  FROM public.feedback f
  WHERE f.feedback_type = 'Captain'
    AND f.target_captain_id = _captain_id
    AND auth.uid() IS NOT NULL
  ORDER BY f.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_captain_complaints(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_captain_complaints(uuid) TO authenticated, service_role;