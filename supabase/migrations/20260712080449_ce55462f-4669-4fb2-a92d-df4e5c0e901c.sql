
ALTER TABLE public.school_rules
  ADD COLUMN IF NOT EXISTS rule_number int,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_school_rules_updated_at ON public.school_rules;
CREATE TRIGGER trg_school_rules_updated_at
BEFORE UPDATE ON public.school_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.school_rules REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.school_rules;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
