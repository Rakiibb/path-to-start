
-- 1) demo_mode flag
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS demo_mode boolean NOT NULL DEFAULT false;

-- 2) tag columns so we only ever remove demo rows
ALTER TABLE public.users         ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.school_rules  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
-- feedback / feedback_votes / sos_requests are covered by CASCADE on demo users

-- 3) enable
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
  rule_titles text[] := ARRAY[
    'Punctuality','Uniform Code','Mobile Phones','Classroom Cleanliness','Homework Submission',
    'Bullying Policy','Library Etiquette','Cafeteria Rules','Sports Ground Safety','Lab Safety',
    'Attendance','Respect for Staff','Language in Class','Bathroom Passes','Digital Etiquette',
    'Lost and Found','Emergency Drills','Visitor Policy','Dress Code','Prayer Assembly',
    'Group Project Guidelines','Exam Conduct','Field Trip Rules','Anti-Ragging','Health & Hygiene'
  ];
  notif_titles text[] := ARRAY['Assembly Reminder','Parent Meeting','Exam Schedule','Sports Day','Holiday Notice','Library Books Due','Cafeteria Menu','New Rule Added','Feedback Verified','Report Ready'];
  demo_users uuid[];
  new_uid uuid;
  fb_id uuid;
  fb_ids uuid[];
  i int;
  j int;
  stat feedback_status;
  cap_ids uuid[];
BEGIN
  SELECT public.has_role('captain') INTO is_cap;
  IF NOT is_cap THEN RAISE EXCEPTION 'Only captains can enable demo mode'; END IF;

  SELECT demo_mode INTO already FROM public.app_settings WHERE id = true;
  IF already THEN RETURN; END IF;

  -- silence side-effect triggers so real users don't get spammed
  ALTER TABLE public.feedback       DISABLE TRIGGER USER;
  ALTER TABLE public.feedback_votes DISABLE TRIGGER USER;
  ALTER TABLE public.sos_requests   DISABLE TRIGGER USER;
  ALTER TABLE public.school_rules   DISABLE TRIGGER USER;
  ALTER TABLE public.notifications  DISABLE TRIGGER USER;

  -- 30 students + 3 captains
  demo_users := ARRAY[]::uuid[];
  FOR i IN 1..30 LOOP
    INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo, height_cm)
    VALUES (
      first_names[1 + (i % array_length(first_names,1))] || ' ' || last_names[1 + (i % array_length(last_names,1))],
      'DEMO' || lpad(i::text, 3, '0'),
      'demo_stu_' || lpad(i::text, 3, '0'),
      'student',
      true,
      140 + (random()*40)::int
    )
    RETURNING id INTO new_uid;
    demo_users := demo_users || new_uid;
  END LOOP;

  cap_ids := ARRAY[]::uuid[];
  FOR i IN 1..3 LOOP
    INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
    VALUES (
      'Captain ' || first_names[i],
      'DEMOC' || i::text,
      'demo_cap_' || i::text,
      'captain',
      true
    )
    RETURNING id INTO new_uid;
    cap_ids := cap_ids || new_uid;
  END LOOP;
  demo_users := demo_users || cap_ids;

  -- 50 feedback with mix of statuses
  fb_ids := ARRAY[]::uuid[];
  FOR i IN 1..50 LOOP
    IF i <= 20 THEN stat := 'Verified';
    ELSIF i <= 40 THEN stat := 'Pending';
    ELSE stat := 'Rejected';
    END IF;
    INSERT INTO public.feedback (created_by, title, category, description, amount, status, created_at)
    VALUES (
      demo_users[1 + ((i-1) % array_length(demo_users,1))],
      cats[1 + (i % array_length(cats,1))] || ' concern #' || i,
      cats[1 + (i % array_length(cats,1))],
      'Demo feedback item ' || i || ' — auto-generated for demonstration.',
      CASE WHEN i % 3 = 0 THEN (100 + random()*900)::numeric(10,2) ELSE NULL END,
      stat,
      now() - (i || ' hours')::interval
    ) RETURNING id INTO fb_id;
    fb_ids := fb_ids || fb_id;
  END LOOP;

  -- random votes: 6-12 votes per feedback
  FOR i IN 1..array_length(fb_ids,1) LOOP
    FOR j IN 1..(6 + (random()*6)::int) LOOP
      BEGIN
        INSERT INTO public.feedback_votes (feedback_id, user_id, vote)
        VALUES (fb_ids[i], demo_users[1 + ((i*7 + j) % array_length(demo_users,1))], random() < 0.75);
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END LOOP;
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

  -- 20 notifications distributed to demo users
  FOR i IN 1..20 LOOP
    INSERT INTO public.notifications (user_id, title, message, category, is_read, is_demo, created_at)
    VALUES (
      demo_users[1 + (i % array_length(demo_users,1))],
      notif_titles[1 + (i % array_length(notif_titles,1))],
      'Demo notification ' || i || '.',
      (ARRAY['General','Feedback','SOS','Rule'])[1 + (i % 4)],
      i % 3 = 0,
      true,
      now() - (i || ' hours')::interval
    );
  END LOOP;

  -- 25 school rules
  FOR i IN 1..25 LOOP
    INSERT INTO public.school_rules (title, description, category, rule_number, is_demo)
    VALUES (
      rule_titles[i],
      'Demo rule description for ' || rule_titles[i] || '.',
      (ARRAY['General','Academic','Safety','Conduct'])[1 + (i % 4)],
      i,
      true
    );
  END LOOP;

  -- re-enable triggers
  ALTER TABLE public.feedback       ENABLE TRIGGER USER;
  ALTER TABLE public.feedback_votes ENABLE TRIGGER USER;
  ALTER TABLE public.sos_requests   ENABLE TRIGGER USER;
  ALTER TABLE public.school_rules   ENABLE TRIGGER USER;
  ALTER TABLE public.notifications  ENABLE TRIGGER USER;

  UPDATE public.app_settings SET demo_mode = true WHERE id = true;
END;
$$;

-- 4) disable
CREATE OR REPLACE FUNCTION public.disable_demo_mode()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role('captain') THEN
    RAISE EXCEPTION 'Only captains can disable demo mode';
  END IF;

  ALTER TABLE public.feedback       DISABLE TRIGGER USER;
  ALTER TABLE public.feedback_votes DISABLE TRIGGER USER;
  ALTER TABLE public.sos_requests   DISABLE TRIGGER USER;
  ALTER TABLE public.school_rules   DISABLE TRIGGER USER;
  ALTER TABLE public.notifications  DISABLE TRIGGER USER;

  DELETE FROM public.notifications WHERE is_demo = true;
  DELETE FROM public.school_rules  WHERE is_demo = true;
  DELETE FROM public.users         WHERE is_demo = true; -- cascades feedback/votes/sos

  ALTER TABLE public.feedback       ENABLE TRIGGER USER;
  ALTER TABLE public.feedback_votes ENABLE TRIGGER USER;
  ALTER TABLE public.sos_requests   ENABLE TRIGGER USER;
  ALTER TABLE public.school_rules   ENABLE TRIGGER USER;
  ALTER TABLE public.notifications  ENABLE TRIGGER USER;

  UPDATE public.app_settings SET demo_mode = false WHERE id = true;
END;
$$;

REVOKE ALL ON FUNCTION public.enable_demo_mode()  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.disable_demo_mode() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enable_demo_mode()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_demo_mode() TO authenticated;
