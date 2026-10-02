ALTER TABLE public.admissions
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS upazila text,
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS post_office text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS education_board text,
  ADD COLUMN IF NOT EXISTS education_group text,
  ADD COLUMN IF NOT EXISTS education_result text,
  ADD COLUMN IF NOT EXISTS passing_year text,
  ADD COLUMN IF NOT EXISTS session text,
  ADD COLUMN IF NOT EXISTS access_token text NOT NULL DEFAULT translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_'),
  ADD COLUMN IF NOT EXISTS phone_normalized text GENERATED ALWAYS AS (right(regexp_replace(phone, '\D', '', 'g'), 11)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS admissions_access_token_key ON public.admissions(access_token);
CREATE UNIQUE INDEX IF NOT EXISTS admissions_unique_email_course ON public.admissions(lower(email), course_id) WHERE status <> 'rejected' AND course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS admissions_unique_phone_course ON public.admissions(phone_normalized, course_id) WHERE status <> 'rejected' AND course_id IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can apply" ON public.admissions;
CREATE POLICY "Anyone can apply" ON public.admissions FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND review_note IS NULL AND reviewed_at IS NULL AND length(access_token) >= 12);

CREATE TABLE public.admission_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admission_activity TO authenticated;
GRANT ALL ON public.admission_activity TO service_role;
ALTER TABLE public.admission_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activity" ON public.admission_activity FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admission_activity_admission_idx ON public.admission_activity(admission_id, created_at DESC);

CREATE OR REPLACE FUNCTION public._actor_name(_uid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(full_name, ''), email, 'Admin') FROM public.profiles WHERE id = _uid
$$;
REVOKE EXECUTE ON FUNCTION public._actor_name(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_admission_activity(_admission_id uuid, _action text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _action NOT IN ('viewed','downloaded_pdf','downloaded_document','viewed_document','approved','rejected') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  INSERT INTO public.admission_activity(admission_id, actor_id, actor_name, action, detail)
  VALUES (_admission_id, auth.uid(), public._actor_name(auth.uid()), _action, coalesce(_detail, '{}'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.log_admission_activity(uuid, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_admission_activity(uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_admission_with_log(_admission_id uuid, _patch jsonb, _note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_row public.admissions;
  old_j jsonb;
  k text;
  allowed text[] := ARRAY['full_name','email','phone','date_of_birth','gender','division','district','upazila','address_line','post_office','postal_code','education_level','institution','education_board','education_group','education_result','passing_year','session','course_id','motivation','document_keys'];
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
    division = r.division, district = r.district, upazila = r.upazila, address_line = r.address_line,
    post_office = r.post_office, postal_code = r.postal_code, education_level = r.education_level,
    institution = r.institution, education_board = r.education_board, education_group = r.education_group,
    education_result = r.education_result, passing_year = r.passing_year, session = r.session,
    course_id = r.course_id, motivation = r.motivation, document_keys = r.document_keys
  WHERE id = _admission_id;
  INSERT INTO public.admission_activity(admission_id, actor_id, actor_name, action, detail, note)
  VALUES (_admission_id, auth.uid(), public._actor_name(auth.uid()), 'edited', jsonb_build_object('changes', changes), nullif(left(trim(coalesce(_note, '')), 1000), ''));
  RETURN jsonb_array_length(changes);
END $$;
REVOKE EXECUTE ON FUNCTION public.update_admission_with_log(uuid, jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_admission_with_log(uuid, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_application_by_token(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (to_jsonb(a) - 'review_note' - 'phone_normalized') || jsonb_build_object('course_title', c.title)
  FROM public.admissions a LEFT JOIN public.courses c ON c.id = a.course_id
  WHERE length(_token) >= 12 AND a.access_token = _token
$$;
REVOKE EXECUTE ON FUNCTION public.get_application_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_application_by_token(text) TO anon, authenticated;