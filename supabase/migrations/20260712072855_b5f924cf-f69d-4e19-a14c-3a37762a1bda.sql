
CREATE OR REPLACE FUNCTION public.recompute_feedback_status(_feedback_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  yes int;
  cur feedback_status;
BEGIN
  SELECT status INTO cur FROM public.feedback WHERE id = _feedback_id;
  IF cur = 'Rejected' THEN RETURN; END IF;

  SELECT COUNT(*) FILTER (WHERE vote = true), COUNT(*)
    INTO yes, total
    FROM public.feedback_votes
    WHERE feedback_id = _feedback_id;

  IF total >= 5 AND (yes::numeric / total::numeric) >= 0.8 THEN
    IF cur <> 'Verified' THEN
      UPDATE public.feedback SET status = 'Verified' WHERE id = _feedback_id;
    END IF;
  ELSE
    IF cur <> 'Pending' THEN
      UPDATE public.feedback SET status = 'Pending' WHERE id = _feedback_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recompute_feedback_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_feedback_status(OLD.feedback_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_feedback_status(NEW.feedback_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS feedback_votes_recompute ON public.feedback_votes;
CREATE TRIGGER feedback_votes_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.feedback_votes
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_feedback_status();

ALTER TABLE public.feedback REPLICA IDENTITY FULL;
ALTER TABLE public.feedback_votes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feedback'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feedback_votes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_votes';
  END IF;
END$$;
