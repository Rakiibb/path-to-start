ALTER TABLE public.users ALTER COLUMN secret_code DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_roll_number_unique ON public.users (roll_number) WHERE roll_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_secret_code_unique ON public.users (secret_code) WHERE secret_code IS NOT NULL;