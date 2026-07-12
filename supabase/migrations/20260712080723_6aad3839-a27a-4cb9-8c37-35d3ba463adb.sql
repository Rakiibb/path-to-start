
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';

DROP POLICY IF EXISTS "Delete own notifications" ON public.notifications;
CREATE POLICY "Delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = public.current_app_user_id());

-- Feedback: notify all users on INSERT and on status change
CREATE OR REPLACE FUNCTION public.notify_all_on_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; m text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    t := 'New Feedback'; m := 'A new feedback has been submitted.';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Verified' THEN
      t := 'Feedback Verified'; m := 'A feedback has been verified.';
    ELSIF NEW.status = 'Rejected' THEN
      t := 'Feedback Rejected'; m := 'A feedback has been rejected.';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, title, message, category)
  SELECT u.id, t, m, 'Feedback' FROM public.users u;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_all_on_feedback() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_feedback_insert ON public.feedback;
CREATE TRIGGER trg_notify_feedback_insert
AFTER INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.notify_all_on_feedback();

DROP TRIGGER IF EXISTS trg_notify_feedback_status ON public.feedback;
CREATE TRIGGER trg_notify_feedback_status
AFTER UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.notify_all_on_feedback();

-- Set category on existing SOS-insert notifier + add resolved notifier
CREATE OR REPLACE FUNCTION public.notify_all_on_sos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, category)
  SELECT u.id,
         '🚨 Emergency Alert',
         'A student needs immediate assistance. Click to view details.',
         'SOS'
  FROM public.users u;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_all_on_sos() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_all_on_sos_resolved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Resolved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, category)
    SELECT u.id, 'SOS Resolved', 'Emergency request has been resolved.', 'SOS'
    FROM public.users u;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_all_on_sos_resolved() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_sos_resolved ON public.sos_requests;
CREATE TRIGGER trg_notify_sos_resolved
AFTER UPDATE ON public.sos_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_all_on_sos_resolved();
