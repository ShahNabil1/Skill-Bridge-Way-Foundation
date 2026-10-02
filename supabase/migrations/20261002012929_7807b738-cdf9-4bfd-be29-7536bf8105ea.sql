CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  class_days text[] NOT NULL DEFAULT '{}',
  class_time text,
  start_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage batches" ON public.batches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.enrollments
  ADD COLUMN batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  ADD COLUMN progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  ADD COLUMN learning_status text NOT NULL DEFAULT 'active' CHECK (learning_status IN ('active','paused','dropped','completed')),
  ADD COLUMN absence_reminders boolean NOT NULL DEFAULT true;

CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, session_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_sessions TO authenticated;
GRANT ALL ON public.class_sessions TO service_role;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sessions" ON public.class_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by uuid,
  marked_at timestamptz NOT NULL DEFAULT now(),
  reminded_at timestamptz,
  UNIQUE (session_id, enrollment_id)
);
CREATE INDEX attendance_enrollment_idx ON public.attendance(enrollment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.student_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX student_activity_idx ON public.student_activity(student_id, created_at DESC);
CREATE INDEX admission_activity_idx ON public.admission_activity(admission_id, created_at DESC);
GRANT SELECT ON public.student_activity TO authenticated;
GRANT ALL ON public.student_activity TO service_role;
ALTER TABLE public.student_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read student activity" ON public.student_activity FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_student_activity(_student_id uuid, _action text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(_action) > 60 THEN RAISE EXCEPTION 'Invalid action'; END IF;
  INSERT INTO public.student_activity(student_id, actor_id, actor_name, action, detail)
  VALUES (_student_id, auth.uid(), public._actor_name(auth.uid()), _action, coalesce(_detail, '{}'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.log_student_activity(uuid, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_student_activity(uuid, text, jsonb) TO authenticated;