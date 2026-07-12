
CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true,
  school_name text NOT NULL DEFAULT 'My School',
  class_name text NOT NULL DEFAULT 'Class',
  sos_enabled boolean NOT NULL DEFAULT true,
  feedback_enabled boolean NOT NULL DEFAULT true,
  min_password_length int NOT NULL DEFAULT 6,
  require_password_number boolean NOT NULL DEFAULT false,
  require_password_symbol boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = true)
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone signed in can read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Captains can update settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.has_role('captain'))
  WITH CHECK (public.has_role('captain'));

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
