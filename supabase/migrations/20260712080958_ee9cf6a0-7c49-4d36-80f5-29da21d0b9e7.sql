
CREATE OR REPLACE FUNCTION public.guard_user_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_service boolean;
BEGIN
  -- service_role (admin server code) bypasses the guard
  is_service := (current_setting('request.jwt.claim.role', true) = 'service_role');
  IF is_service THEN RETURN NEW; END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.roll_number IS DISTINCT FROM OLD.roll_number
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Not allowed to change role, roll number, password, or auth link';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_user_self_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_user_self_update ON public.users;
CREATE TRIGGER trg_guard_user_self_update
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_user_self_update();
