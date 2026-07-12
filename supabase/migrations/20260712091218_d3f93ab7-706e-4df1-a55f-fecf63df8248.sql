CREATE OR REPLACE FUNCTION public.enable_demo_mode()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  kuddus uuid; minto uuid; bolto uuid;
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

  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Kuddus','DEMOC1','demo_cap_kuddus','captain',true) RETURNING id INTO kuddus;
  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Minto','DEMOC2','demo_cap_minto','captain',true) RETURNING id INTO minto;
  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Bolto','DEMOC3','demo_cap_bolto','captain',true) RETURNING id INTO bolto;
  cap_ids := ARRAY[kuddus, minto, bolto];
  demo_users := demo_users || cap_ids;

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

  FOR i IN 1..20 LOOP
    target := cap_ids[1 + (i % 3)];

    IF (target = kuddus AND i <= 3) THEN stat := 'Verified';
    ELSIF (target = minto AND i = 2) THEN stat := 'Verified';
    ELSIF i % 5 = 0 THEN stat := 'Rejected';
    ELSE stat := 'Pending';
    END IF;
    IF target = bolto AND stat = 'Verified' THEN stat := 'Pending'; END IF;

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

  verified_count := 0;
END; $function$;