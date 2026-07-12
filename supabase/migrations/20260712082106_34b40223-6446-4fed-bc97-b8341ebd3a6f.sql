
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
CREATE INDEX activity_logs_actor_idx ON public.activity_logs (actor_id);
CREATE INDEX activity_logs_action_idx ON public.activity_logs (action);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captains can read activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role('captain'));

CREATE POLICY "Signed in users can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

-- Helper: resolve actor's display name
CREATE OR REPLACE FUNCTION public.log_activity(
  _action text,
  _entity text,
  _entity_id uuid,
  _details jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid;
  _actor_name text;
BEGIN
  SELECT id, full_name INTO _actor_id, _actor_name
  FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;

  INSERT INTO public.activity_logs (actor_id, actor_name, action, entity, entity_id, details)
  VALUES (_actor_id, _actor_name, _action, _entity, _entity_id, COALESCE(_details, '{}'::jsonb));
END; $$;

-- Triggers
CREATE OR REPLACE FUNCTION public.trg_log_feedback() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('Feedback Created', 'feedback', NEW.id,
      jsonb_build_object('title', NEW.title, 'category', NEW.category));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER activity_log_feedback
  AFTER INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_feedback();

CREATE OR REPLACE FUNCTION public.trg_log_vote() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_activity('Vote Submitted', 'feedback', NEW.feedback_id,
    jsonb_build_object('vote', NEW.vote));
  RETURN NEW;
END; $$;

CREATE TRIGGER activity_log_vote
  AFTER INSERT ON public.feedback_votes
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_vote();

CREATE OR REPLACE FUNCTION public.trg_log_sos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('SOS Triggered', 'sos_request', NEW.id,
      jsonb_build_object('message', NEW.message));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Resolved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity('SOS Resolved', 'sos_request', NEW.id, '{}'::jsonb);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER activity_log_sos
  AFTER INSERT OR UPDATE ON public.sos_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_sos();

CREATE OR REPLACE FUNCTION public.trg_log_rule() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('Rule Added', 'school_rule', NEW.id,
      jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity('Rule Edited', 'school_rule', NEW.id,
      jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity('Rule Deleted', 'school_rule', OLD.id,
      jsonb_build_object('title', OLD.title));
    RETURN OLD;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER activity_log_rule
  AFTER INSERT OR UPDATE OR DELETE ON public.school_rules
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_rule();
