
-- Allow all authenticated users to read SOS requests (so everyone sees active alerts)
DROP POLICY IF EXISTS "Read all sos" ON public.sos_requests;
CREATE POLICY "Read all sos" ON public.sos_requests
  FOR SELECT TO authenticated USING (true);

-- Allow user to update their own SOS (to add location/message details after creation)
DROP POLICY IF EXISTS "Update own sos" ON public.sos_requests;
CREATE POLICY "Update own sos" ON public.sos_requests
  FOR UPDATE TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

-- Trigger: fan out a notification to every app user when a new SOS is created
CREATE OR REPLACE FUNCTION public.notify_all_on_sos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message)
  SELECT u.id,
         '🚨 Emergency Alert',
         'A student needs immediate assistance. Click to view details.'
  FROM public.users u;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_all_on_sos ON public.sos_requests;
CREATE TRIGGER trg_notify_all_on_sos
AFTER INSERT ON public.sos_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_all_on_sos();

-- Enable realtime
ALTER TABLE public.sos_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
