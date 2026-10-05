ALTER TABLE public.admissions
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS union_name text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS digital_access text[],
  ADD COLUMN IF NOT EXISTS attendance_commitment smallint;

ALTER TABLE public.admissions
  ADD CONSTRAINT admissions_occupation_chk CHECK (occupation IS NULL OR occupation IN ('Student','Job seeker','Entrepreneur','Freelancer','Young professional','Technology enthusiast')),
  ADD CONSTRAINT admissions_digital_access_chk CHECK (digital_access IS NULL OR digital_access <@ ARRAY['Laptop','Desktop computer','Smartphone']::text[]),
  ADD CONSTRAINT admissions_attendance_chk CHECK (attendance_commitment IS NULL OR attendance_commitment IN (100,90,80,75));

CREATE OR REPLACE FUNCTION public.update_admission_with_log(_admission_id uuid, _patch jsonb, _note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_row public.admissions;
  old_j jsonb;
  k text;
  allowed text[] := ARRAY['full_name','email','phone','date_of_birth','gender','occupation','division','district','upazila','union_name','village','address_line','post_office','postal_code','education_level','institution','education_board','education_group','education_result','passing_year','session','course_id','motivation','digital_access','attendance_commitment','document_keys'];
  clean jsonb := '{}'::jsonb;
  changes jsonb := '[]'::jsonb;
  r public.admissions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO old_row FROM public.admissions WHERE id = _admission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  old_j := to_jsonb(old_row);
  FOR k IN SELECT jsonb_object_keys(_patch) LOOP
    IF k = ANY(allowed) AND (old_j -> k) IS DISTINCT FROM (_patch -> k) THEN
      clean := clean || jsonb_build_object(k, _patch -> k);
      changes := changes || jsonb_build_array(jsonb_build_object('field', k, 'from', old_j -> k, 'to', _patch -> k));
    END IF;
  END LOOP;
  IF jsonb_array_length(changes) = 0 THEN RETURN 0; END IF;
  r := jsonb_populate_record(old_row, clean);
  UPDATE public.admissions SET
    full_name = r.full_name, email = r.email, phone = r.phone, date_of_birth = r.date_of_birth, gender = r.gender,
    occupation = r.occupation, division = r.division, district = r.district, upazila = r.upazila,
    union_name = r.union_name, village = r.village, address_line = r.address_line,
    post_office = r.post_office, postal_code = r.postal_code, education_level = r.education_level,
    institution = r.institution, education_board = r.education_board, education_group = r.education_group,
    education_result = r.education_result, passing_year = r.passing_year, session = r.session,
    course_id = r.course_id, motivation = r.motivation, digital_access = r.digital_access,
    attendance_commitment = r.attendance_commitment, document_keys = r.document_keys
  WHERE id = _admission_id;
  INSERT INTO public.admission_activity(admission_id, actor_id, actor_name, action, detail, note)
  VALUES (_admission_id, auth.uid(), public._actor_name(auth.uid()), 'edited', jsonb_build_object('changes', changes), nullif(left(trim(coalesce(_note, '')), 1000), ''));
  RETURN jsonb_array_length(changes);
END $$;
REVOKE EXECUTE ON FUNCTION public.update_admission_with_log(uuid, jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_admission_with_log(uuid, jsonb, text) TO authenticated;