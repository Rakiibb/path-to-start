
-- Enums
CREATE TYPE public.app_role AS ENUM ('student', 'captain');
CREATE TYPE public.feedback_status AS ENUM ('Pending', 'Verified', 'Rejected');
CREATE TYPE public.sos_status AS ENUM ('Active', 'Resolved');

-- =========================================================================
-- users table (application users; auth_user_id links to auth.users)
-- =========================================================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  secret_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  roll_number text,
  height_cm numeric,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper functions (defined AFTER users table so they can reference it) --------
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = _role
  );
$$;

-- users policies
CREATE POLICY "Users can read own row"
  ON public.users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Captains can read all users"
  ON public.users FOR SELECT TO authenticated
  USING (public.has_role('captain'));

CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- =========================================================================
-- feedback
-- =========================================================================
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  description text,
  amount numeric,
  status public.feedback_status NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read verified feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (status = 'Verified');

CREATE POLICY "Read own feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (created_by = public.current_app_user_id());

CREATE POLICY "Captains read all feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (public.has_role('captain'));

CREATE POLICY "Users create own feedback"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (created_by = public.current_app_user_id());

CREATE POLICY "Users update own pending feedback"
  ON public.feedback FOR UPDATE TO authenticated
  USING (created_by = public.current_app_user_id() AND status = 'Pending')
  WITH CHECK (created_by = public.current_app_user_id() AND status = 'Pending');

CREATE POLICY "Captains update feedback"
  ON public.feedback FOR UPDATE TO authenticated
  USING (public.has_role('captain'))
  WITH CHECK (public.has_role('captain'));

CREATE POLICY "Users delete own pending feedback"
  ON public.feedback FOR DELETE TO authenticated
  USING (created_by = public.current_app_user_id() AND status = 'Pending');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_feedback_updated
BEFORE UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- feedback_votes
-- =========================================================================
CREATE TABLE public.feedback_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feedback_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_votes TO authenticated;
GRANT ALL ON public.feedback_votes TO service_role;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read all votes"
  ON public.feedback_votes FOR SELECT TO authenticated
  USING (true);

-- Cannot vote on own feedback; one vote per user enforced by UNIQUE constraint
CREATE POLICY "Insert own vote (not on own feedback)"
  ON public.feedback_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_app_user_id()
    AND NOT EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_id AND f.created_by = public.current_app_user_id()
    )
  );

CREATE POLICY "Update own vote"
  ON public.feedback_votes FOR UPDATE TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "Delete own vote"
  ON public.feedback_votes FOR DELETE TO authenticated
  USING (user_id = public.current_app_user_id());

-- =========================================================================
-- sos_requests
-- =========================================================================
CREATE TABLE public.sos_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  location text,
  message text,
  status public.sos_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_requests TO authenticated;
GRANT ALL ON public.sos_requests TO service_role;
ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own sos"
  ON public.sos_requests FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "Captains read all sos"
  ON public.sos_requests FOR SELECT TO authenticated
  USING (public.has_role('captain'));

CREATE POLICY "Create own sos"
  ON public.sos_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "Captains update sos status"
  ON public.sos_requests FOR UPDATE TO authenticated
  USING (public.has_role('captain'))
  WITH CHECK (public.has_role('captain'));

-- =========================================================================
-- notifications
-- =========================================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "Update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

-- =========================================================================
-- school_rules
-- =========================================================================
CREATE TABLE public.school_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  keywords text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_rules TO authenticated;
GRANT ALL ON public.school_rules TO service_role;
ALTER TABLE public.school_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads school rules"
  ON public.school_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Captains manage school rules insert"
  ON public.school_rules FOR INSERT TO authenticated
  WITH CHECK (public.has_role('captain'));

CREATE POLICY "Captains manage school rules update"
  ON public.school_rules FOR UPDATE TO authenticated
  USING (public.has_role('captain'))
  WITH CHECK (public.has_role('captain'));

CREATE POLICY "Captains manage school rules delete"
  ON public.school_rules FOR DELETE TO authenticated
  USING (public.has_role('captain'));

-- =========================================================================
-- seat_students
-- =========================================================================
CREATE TABLE public.seat_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  roll_number text,
  height_cm numeric,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seat_students TO authenticated;
GRANT ALL ON public.seat_students TO service_role;
ALTER TABLE public.seat_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads seat students"
  ON public.seat_students FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Captains insert seat students"
  ON public.seat_students FOR INSERT TO authenticated
  WITH CHECK (public.has_role('captain') AND created_by = public.current_app_user_id());

CREATE POLICY "Captains update seat students"
  ON public.seat_students FOR UPDATE TO authenticated
  USING (public.has_role('captain'))
  WITH CHECK (public.has_role('captain'));

CREATE POLICY "Captains delete seat students"
  ON public.seat_students FOR DELETE TO authenticated
  USING (public.has_role('captain'));
