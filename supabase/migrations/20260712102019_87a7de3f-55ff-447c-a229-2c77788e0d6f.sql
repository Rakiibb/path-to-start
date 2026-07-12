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
  cap_cats text[] := ARRAY['Academic','Behavior','Leadership','Fund Issue','Communication','Other'];
  demo_users uuid[];
  cap_ids uuid[];
  new_uid uuid;
  kuddus uuid; minto uuid; bolto uuid;
  target uuid;
  i int;
  stat feedback_status;
BEGIN
  SELECT public.has_role('captain') INTO is_cap;
  IF NOT is_cap THEN RAISE EXCEPTION 'Only captains can enable demo mode'; END IF;

  SELECT demo_mode INTO already FROM public.app_settings WHERE id = true;
  IF already THEN RETURN; END IF;

  ALTER TABLE public.feedback DISABLE TRIGGER USER;

  demo_users := ARRAY[]::uuid[];
  FOR i IN 1..30 LOOP
    INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo, height_cm)
    VALUES (
      first_names[1 + (i % array_length(first_names,1))] || ' ' || last_names[1 + (i % array_length(last_names,1))],
      'DEMO' || lpad(i::text, 3, '0'),
      NULL,
      'student', true, 140 + (random()*40)::int
    ) RETURNING id INTO new_uid;
    demo_users := demo_users || new_uid;
  END LOOP;

  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Kuddus','DEMOC1',NULL,'captain',true) RETURNING id INTO kuddus;
  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Minto','DEMOC2',NULL,'captain',true) RETURNING id INTO minto;
  INSERT INTO public.users (full_name, roll_number, secret_code, role, is_demo)
  VALUES ('Captain Bolto','DEMOC3',NULL,'captain',true) RETURNING id INTO bolto;
  cap_ids := ARRAY[kuddus, minto, bolto];

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

  ALTER TABLE public.feedback ENABLE TRIGGER USER;

  UPDATE public.app_settings SET demo_mode = true WHERE id = true;
END; $function$;