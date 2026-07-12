CREATE OR REPLACE FUNCTION public.guard_user_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR session_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.roll_number IS DISTINCT FROM OLD.roll_number
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR (OLD.auth_user_id IS NOT NULL AND NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id) THEN
    RAISE EXCEPTION 'Not allowed to change role, roll number, password, or auth link';
  END IF;
  RETURN NEW;
END;
$$;

DELETE FROM public.users
WHERE auth_user_id IS NULL
  AND (
    roll_number IN ('student', 'teacher', 'fixed_student', 'fixed_teacher')
    OR secret_code IN ('student', 'teacher', 'fixed_student', 'fixed_teacher')
  );