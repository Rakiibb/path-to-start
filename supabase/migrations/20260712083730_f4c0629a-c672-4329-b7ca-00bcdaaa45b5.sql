
-- 1) columns
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS feedback_type text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS target_captain_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_type_check CHECK (feedback_type IN ('General','Captain'));

CREATE INDEX IF NOT EXISTS feedback_target_captain_idx
  ON public.feedback (target_captain_id) WHERE feedback_type = 'Captain';

-- 2) guard trigger for captain feedback (self-target + 24h rate limit)
CREATE OR REPLACE FUNCTION public.guard_captain_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recent_count int;
BEGIN
  IF NEW.feedback_type <> 'Captain' THEN RETURN NEW; END IF;

  IF NEW.target_captain_id IS NULL THEN
    RAISE EXCEPTION 'target_captain_id is required for captain feedback';
  END IF;

  IF NEW.target_captain_id = NEW.created_by THEN
    RAISE EXCEPTION 'You cannot submit feedback about yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = NEW.target_captain_id AND role = 'captain'
  ) THEN
    RAISE EXCEPTION 'Target user is not a captain';
  END IF;

  -- 24h limit: skip while seeding demo data (triggers are disabled then anyway)
  SELECT count(*) INTO recent_count
  FROM public.feedback
  WHERE created_by = NEW.created_by
    AND feedback_type = 'Captain'
    AND created_at > now() - interval '24 hours';
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'You can only submit one captain feedback every 24 hours';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_captain_feedback ON public.feedback;
CREATE TRIGGER trg_guard_captain_feedback
BEFORE INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.guard_captain_feedback();

-- 3) extend enable_demo_mode with named captains + 20 captain feedback
CREATE OR REPLACE FUNCTION public.enable_demo_mode()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_cap boolean;
  already boolean;
  first_names text[] := ARRAY['Aarav','Diya','Kabir','Ishaan','Meera','Rohan','Aditi','Vivaan','Sara','Arjun','Anaya','Vihaan','Kiara','Rehan','Neha','Aryan','Priya','Karan','Riya','Dev','Zara','Yash','Anika','Reyansh','Myra','Ayaan','Tara','Krish','Nisha','Manav','Aditya','Sana','Ved'];
  last_names  text[] := ARRAY['Sharma','Verma','Iyer','Patel','Khan','Singh','Reddy','Menon','Gupta','Rao'];
  cats text[] := ARRAY['Academics','Facilities','Events','Cafeteria','Sports','Library','Discipline','Transport'];
  cap_cats text[] := ARRAY['Academic','Behavior','Leadership','Fund Issue','Communication','Other'];
  rule_titles text[] := ARRAY[
    'Punctuality','Uniform Code','Mobile Phones','Classroom Cleanliness','Homework Submission',
    'Bullying Policy','Library Etiquette','Cafeteria Rules','Sports Ground Safety','Lab Safety',
    'Attendance','Respect for Staff','Language in Class','Bathroom Passes','Digital Etiquette',
    'Lost and Found','Emergency Drills','Visitor Policy','Dress Code','Prayer Assembly',
    'Group Project Guidelines','Exam Conduct','Field Trip Rules','Anti-Ragging','Health & Hygiene'
  ];
  notif_titles text[] := ARRAY['Assembly Reminder','Parent Meeting','Exam Schedule','Sports Day','Holiday Notice','Library Books Due','Cafeteria Menu','New Rule Added','Feedback Verified','Report Ready'];
  demo_users uuid[];
  cap_ids uuid[];
  new_uid uuid;
  fb_id uuid;
  fb_ids uuid[];
  kuddus uuid; rahim uuid; sohan uuid;
  target uuid; verified_count int;
  i int; j int;
  stat feedback_status;
BEGIN
  SELECT public.has_role('captain') INTO is_cap;
  IF NOT is_cap THEN RAISE EXCEPTION 'Only captains can enable demo mode'; END IF;

  SELECT demo_mode INTO already FROM public.app_settings WHERE id = true;
  IF already THEN RETURN; END IF;

  ALTER TABLE public.feedback       DISABLE TRIGGER USER;
  ALTER TABLE public.feedback_votes DISABLE TRIGGER USER;
  ALTER TABLE public.sos_requests   DISABLE TRIGGER USER;
  ALTER TABLE public.school_rules   DISABLE TRIGGER USER;
  ALTER TABLE public.notifications  DISABLE TRIGGER USER;

  -- 30 demo students
  demo_users := ARRAY[]::uuid[];
  FOR i IN 1..30 LOOP
    INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo, height_cm)
    VALUES (
      first_names[1 + (i % array_length(first_names,1))] || ' ' || last_names[1 + (i % array_length(last_names,1))],
      'DEMO' || lpad(i::text, 3, '0'),
      'demo_stu_' || lpad(i::text, 3, '0'),
      'student', true, 140 + (random()*40)::int
    ) RETURNING id INTO new_uid;
    demo_users := demo_users || new_uid;
  END LOOP;

  -- 3 named captains
  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Kuddus','DEMOC1','demo_cap_kuddus','captain',true) RETURNING id INTO kuddus;
  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Rahim','DEMOC2','demo_cap_rahim','captain',true) RETURNING id INTO rahim;
  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Sohan','DEMOC3','demo_cap_sohan','captain',true) RETURNING id INTO sohan;
  cap_ids := ARRAY[kuddus, rahim, sohan];
  demo_users := demo_users || cap_ids;

  -- 50 general feedback (unchanged behaviour)
  fb_ids := ARRAY[]::uuid[];
  FOR i IN 1..50 LOOP
    IF i <= 20 THEN stat := 'Verified';
    ELSIF i <= 40 THEN stat := 'Pending';
    ELSE stat := 'Rejected'; END IF;
    INSERT INTO public.feedback (created_by, title, category, description, amount, status, created_at, feedback_type)
    VALUES (
      demo_users[1 + ((i-1) % array_length(demo_users,1))],
      cats[1 + (i % array_length(cats,1))] || ' concern #' || i,
      cats[1 + (i % array_length(cats,1))],
      'Demo feedback item ' || i || ' — auto-generated for demonstration.',
      CASE WHEN i % 3 = 0 THEN (100 + random()*900)::numeric(10,2) ELSE NULL END,
      stat,
      now() - (i || ' hours')::interval,
      'General'
    ) RETURNING id INTO fb_id;
    fb_ids := fb_ids || fb_id;
  END LOOP;

  FOR i IN 1..array_length(fb_ids,1) LOOP
    FOR j IN 1..(6 + (random()*6)::int) LOOP
      BEGIN
        INSERT INTO public.feedback_votes (feedback_id, user_id, vote)
        VALUES (fb_ids[i], demo_users[1 + ((i*7 + j) % array_length(demo_users,1))], random() < 0.75);
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END LOOP;
  END LOOP;

  -- 20 CAPTAIN feedback — Kuddus 3 verified, Rahim 1 verified, Sohan 0 verified, rest mixed
  FOR i IN 1..20 LOOP
    -- distribute targets so Kuddus/Rahim/Sohan each get a decent share
    target := cap_ids[1 + (i % 3)];

    -- forced verified quota
    IF (target = kuddus AND i <= 3) THEN stat := 'Verified';
    ELSIF (target = rahim AND i = 2) THEN stat := 'Verified';
    ELSIF i % 5 = 0 THEN stat := 'Rejected';
    ELSE stat := 'Pending';
    END IF;
    -- make sure Sohan never gets Verified
    IF target = sohan AND stat = 'Verified' THEN stat := 'Pending'; END IF;

    INSERT INTO public.feedback (
      created_by, title, category, description, status, created_at,
      feedback_type, target_captain_id
    ) VALUES (
      demo_users[1 + (i % 30)],
      cap_cats[1 + (i % array_length(cap_cats,1))] || ' concern about captain',
      cap_cats[1 + (i % array_length(cap_cats,1))],
      'Captain feedback demo item ' || i || ' describing the captain''s handling of a recent classroom situation.',
      stat,
      now() - (i || ' hours')::interval,
      'Captain', target
    );
  END LOOP;

  -- 10 SOS
  FOR i IN 1..10 LOOP
    INSERT INTO public.sos_requests (user_id, location, message, status, created_at)
    VALUES (
      demo_users[1 + (i % 30)],
      (ARRAY['Playground','Cafeteria','Hallway','Library','Lab'])[1 + (i % 5)],
      (ARRAY['Feeling unwell','Injury','Bullying incident','Fire alarm','Panic attack'])[1 + (i % 5)],
      CASE WHEN i <= 7 THEN 'Resolved'::sos_status ELSE 'Active'::sos_status END,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- 20 notifications
  FOR i IN 1..20 LOOP
    INSERT INTO public.notifications (user_id, title, message, category, is_read, is_demo, created_at)
    VALUES (
      demo_users[1 + (i % array_length(demo_users,1))],
      notif_titles[1 + (i % array_length(notif_titles,1))],
      'Demo notification ' || i || '.',
      (ARRAY['General','Feedback','SOS','Rule'])[1 + (i % 4)],
      i % 3 = 0, true, now() - (i || ' hours')::interval
    );
  END LOOP;

  -- 25 school rules
  FOR i IN 1..25 LOOP
    INSERT INTO public.school_rules (title, description, category, rule_number, is_demo)
    VALUES (
      rule_titles[i],
      'Demo rule description for ' || rule_titles[i] || '.',
      (ARRAY['General','Academic','Safety','Conduct'])[1 + (i % 4)],
      i, true
    );
  END LOOP;

  ALTER TABLE public.feedback       ENABLE TRIGGER USER;
  ALTER TABLE public.feedback_votes ENABLE TRIGGER USER;
  ALTER TABLE public.sos_requests   ENABLE TRIGGER USER;
  ALTER TABLE public.school_rules   ENABLE TRIGGER USER;
  ALTER TABLE public.notifications  ENABLE TRIGGER USER;

  UPDATE public.app_settings SET demo_mode = true WHERE id = true;

  -- keep the linter happy about the unused verified_count
  verified_count := 0;
END; $$;
