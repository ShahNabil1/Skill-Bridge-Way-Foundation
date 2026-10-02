CREATE TABLE public.course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_categories TO authenticated;
GRANT ALL ON public.course_categories TO service_role;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.course_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.course_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.course_categories(name) SELECT DISTINCT category FROM public.courses WHERE category IS NOT NULL AND category <> '' ON CONFLICT DO NOTHING;

ALTER TABLE public.courses
  ADD COLUMN image_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN video_url text,
  ADD COLUMN duration_value integer,
  ADD COLUMN duration_unit text CHECK (duration_unit IN ('days','weeks','months')),
  ADD COLUMN apply_start timestamptz,
  ADD COLUMN apply_end timestamptz;
UPDATE public.courses SET image_keys = jsonb_build_array(cover_image_key) WHERE cover_image_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_apply_window() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s timestamptz; e timestamptz;
BEGIN
  IF NEW.course_id IS NULL THEN RETURN NEW; END IF;
  SELECT apply_start, apply_end INTO s, e FROM public.courses WHERE id = NEW.course_id;
  IF (s IS NOT NULL AND now() < s) OR (e IS NOT NULL AND now() > e) THEN
    RAISE EXCEPTION 'Applications are closed for this course' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_admissions_apply_window BEFORE INSERT ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.enforce_apply_window();