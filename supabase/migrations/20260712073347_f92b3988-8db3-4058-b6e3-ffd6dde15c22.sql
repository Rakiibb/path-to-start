
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_secret_code_format;
ALTER TABLE public.users
  ADD CONSTRAINT users_secret_code_format
  CHECK (secret_code IS NULL OR secret_code ~ '^[A-Za-z0-9_.]{4,20}$');

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Safe public view: only id + secret_code, readable by any signed-in user.
CREATE OR REPLACE VIEW public.user_identities
WITH (security_invoker = false) AS
SELECT id, secret_code FROM public.users WHERE secret_code IS NOT NULL;

GRANT SELECT ON public.user_identities TO authenticated;
