
CREATE OR REPLACE FUNCTION public.all_permission_keys() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'dashboard.view',
    'applications.view','applications.edit','applications.decide','applications.delete','applications.documents',
    'students.view','students.personal','students.edit','students.attendance','students.reminders',
    'certificates.generate','certificates.revoke','certificates.update_all',
    'courses.view','courses.create','courses.edit','courses.publish','courses.delete',
    'notices.view','notices.create','notices.edit','notices.publish','notices.delete',
    'gallery.view','gallery.create','gallery.edit','gallery.delete',
    'partners.view','partners.create','partners.edit','partners.publish','partners.delete',
    'translations.view','translations.edit','translations.delete',
    'users.view','users.invite','users.manage','users.personal','users.edit','users.reset_password',
    'users.sessions','users.ban','users.delete','users.permissions','users.activity'
  ]::text[]
$$;

CREATE TABLE public.user_permissions (
  user_id uuid NOT NULL,
  permission text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (public.is_super_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = _user_id AND permission = _perm))
$$;

CREATE OR REPLACE FUNCTION public.my_permissions() RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_super_admin(auth.uid()) THEN public.all_permission_keys()
    ELSE coalesce((SELECT array_agg(permission) FROM public.user_permissions WHERE user_id = auth.uid()), '{}') END
$$;

CREATE POLICY "Read own or with users.view" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users.view'));

-- migrate existing admins to full access
INSERT INTO public.user_permissions (user_id, permission)
SELECT r.user_id, k FROM public.user_roles r CROSS JOIN unnest(public.all_permission_keys()) k
WHERE r.role = 'admin' ON CONFLICT DO NOTHING;

-- sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  auth_session_id uuid,
  ip text, user_agent text, device text, browser text, os text,
  city text, region text, country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoke_reason text,
  UNIQUE (auth_session_id)
);
CREATE INDEX ON public.user_sessions (user_id, last_seen_at DESC);
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own sessions or with users.sessions" ON public.user_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users.sessions'));
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;

-- activity
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  kind text NOT NULL,
  page text,
  seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_activity (user_id, created_at DESC);
GRANT SELECT ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own activity or with users.activity" ON public.user_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users.activity'));

-- audit
CREATE TABLE public.user_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid, actor_name text,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_admin_audit (target_user_id, created_at DESC);
GRANT SELECT ON public.user_admin_audit TO authenticated;
GRANT ALL ON public.user_admin_audit TO service_role;
ALTER TABLE public.user_admin_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read audit with users.manage" ON public.user_admin_audit FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'));

-- service-role only: end an auth session
CREATE OR REPLACE FUNCTION public.admin_end_auth_sessions(_user_id uuid, _session_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF _session_id IS NULL THEN DELETE FROM auth.sessions WHERE user_id = _user_id;
  ELSE DELETE FROM auth.sessions WHERE id = _session_id AND user_id = _user_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_end_auth_sessions(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_auth_sessions(uuid, uuid) TO service_role;

-- report
CREATE OR REPLACE FUNCTION public.user_activity_report(_user_id uuid, _from timestamptz, _to timestamptz) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_permission(auth.uid(), 'users.activity') OR auth.uid() = _user_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_seconds', coalesce((SELECT sum(seconds) FROM user_activity WHERE user_id=_user_id AND created_at BETWEEN _from AND _to),0),
    'sessions', (SELECT count(*) FROM user_sessions WHERE user_id=_user_id AND created_at BETWEEN _from AND _to),
    'actions', (SELECT count(*) FROM admission_activity WHERE actor_id=_user_id AND created_at BETWEEN _from AND _to)
             + (SELECT count(*) FROM student_activity WHERE actor_id=_user_id AND created_at BETWEEN _from AND _to)
             + (SELECT count(*) FROM user_admin_audit WHERE actor_id=_user_id AND created_at BETWEEN _from AND _to),
    'by_day', coalesce((SELECT jsonb_agg(jsonb_build_object('day', d, 'seconds', s) ORDER BY d) FROM (
        SELECT (created_at AT TIME ZONE 'Asia/Dhaka')::date d, sum(seconds) s FROM user_activity
        WHERE user_id=_user_id AND created_at BETWEEN _from AND _to GROUP BY 1) x), '[]'),
    'by_page', coalesce((SELECT jsonb_agg(jsonb_build_object('page', page, 'seconds', s) ORDER BY s DESC) FROM (
        SELECT page, sum(seconds) s FROM user_activity WHERE user_id=_user_id AND created_at BETWEEN _from AND _to AND page IS NOT NULL
        GROUP BY page ORDER BY 2 DESC LIMIT 15) y), '[]'),
    'timeline', coalesce((SELECT jsonb_agg(t ORDER BY (t->>'at') DESC) FROM (
        SELECT jsonb_build_object('at', created_at, 'source','application','action', action, 'detail', detail) t FROM admission_activity WHERE actor_id=_user_id AND created_at BETWEEN _from AND _to
        UNION ALL SELECT jsonb_build_object('at', created_at, 'source','student','action', action, 'detail', detail) FROM student_activity WHERE actor_id=_user_id AND created_at BETWEEN _from AND _to
        UNION ALL SELECT jsonb_build_object('at', created_at, 'source','users','action', action, 'detail', detail) FROM user_admin_audit WHERE actor_id=_user_id AND created_at BETWEEN _from AND _to
        UNION ALL SELECT jsonb_build_object('at', created_at, 'source','page','action', 'visited', 'detail', jsonb_build_object('page', page)) FROM user_activity WHERE user_id=_user_id AND kind='page' AND created_at BETWEEN _from AND _to
        ORDER BY 1 DESC LIMIT 200) z), '[]')
  ) INTO r;
  RETURN r;
END $$;

-- ===== replace admin-wide policies with granular ones =====
DROP POLICY "Admins read activity" ON public.admission_activity;
CREATE POLICY "Read activity" ON public.admission_activity FOR SELECT TO authenticated USING (has_permission(auth.uid(),'applications.view'));

DROP POLICY "Admins delete admissions" ON public.admissions;
DROP POLICY "Admins read admissions" ON public.admissions;
DROP POLICY "Admins update admissions" ON public.admissions;
CREATE POLICY "Read admissions" ON public.admissions FOR SELECT TO authenticated USING (has_permission(auth.uid(),'applications.view') OR has_permission(auth.uid(),'students.view'));
CREATE POLICY "Update admissions" ON public.admissions FOR UPDATE TO authenticated USING (has_permission(auth.uid(),'applications.edit') OR has_permission(auth.uid(),'applications.decide')) WITH CHECK (has_permission(auth.uid(),'applications.edit') OR has_permission(auth.uid(),'applications.decide'));
CREATE POLICY "Delete admissions" ON public.admissions FOR DELETE TO authenticated USING (has_permission(auth.uid(),'applications.delete'));

DROP POLICY "Admins manage attendance" ON public.attendance;
CREATE POLICY "Read attendance" ON public.attendance FOR SELECT TO authenticated USING (has_permission(auth.uid(),'students.view') OR has_permission(auth.uid(),'students.attendance'));
CREATE POLICY "Write attendance" ON public.attendance FOR ALL TO authenticated USING (has_permission(auth.uid(),'students.attendance')) WITH CHECK (has_permission(auth.uid(),'students.attendance'));

DROP POLICY "Admins manage sessions" ON public.class_sessions;
CREATE POLICY "Read class sessions" ON public.class_sessions FOR SELECT TO authenticated USING (has_permission(auth.uid(),'students.view') OR has_permission(auth.uid(),'students.attendance'));
CREATE POLICY "Write class sessions" ON public.class_sessions FOR ALL TO authenticated USING (has_permission(auth.uid(),'students.attendance')) WITH CHECK (has_permission(auth.uid(),'students.attendance'));

DROP POLICY "Admins manage batches" ON public.batches;
CREATE POLICY "Read batches" ON public.batches FOR SELECT TO authenticated USING (has_permission(auth.uid(),'students.view') OR has_permission(auth.uid(),'students.attendance'));
CREATE POLICY "Write batches" ON public.batches FOR ALL TO authenticated USING (has_permission(auth.uid(),'students.edit')) WITH CHECK (has_permission(auth.uid(),'students.edit'));

DROP POLICY "Admins manage certificates" ON public.certificates;
CREATE POLICY "Read certificates" ON public.certificates FOR SELECT TO authenticated USING (has_permission(auth.uid(),'students.view'));
CREATE POLICY "Update certificates" ON public.certificates FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(),'certificates.generate') OR has_permission(auth.uid(),'certificates.revoke') OR has_permission(auth.uid(),'certificates.update_all'))
  WITH CHECK (has_permission(auth.uid(),'certificates.generate') OR has_permission(auth.uid(),'certificates.revoke') OR has_permission(auth.uid(),'certificates.update_all'));
CREATE POLICY "Delete certificates" ON public.certificates FOR DELETE TO authenticated USING (has_permission(auth.uid(),'certificates.revoke'));

CREATE OR REPLACE FUNCTION public.guard_certificate_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.is_revoked IS DISTINCT FROM OLD.is_revoked AND NOT has_permission(auth.uid(),'certificates.revoke') THEN
    RAISE EXCEPTION 'You do not have permission to revoke certificates'; END IF;
  IF NEW.pdf_key IS DISTINCT FROM OLD.pdf_key AND NOT (has_permission(auth.uid(),'certificates.generate') OR has_permission(auth.uid(),'certificates.update_all')) THEN
    RAISE EXCEPTION 'You do not have permission to generate certificates'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_certificate_update BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.guard_certificate_update();

DROP POLICY "Admins manage categories" ON public.course_categories;
CREATE POLICY "Write categories" ON public.course_categories FOR ALL TO authenticated USING (has_permission(auth.uid(),'courses.edit')) WITH CHECK (has_permission(auth.uid(),'courses.edit'));

DROP POLICY "Admins manage enrollments" ON public.enrollments;
CREATE POLICY "Read enrollments" ON public.enrollments FOR SELECT TO authenticated USING (has_permission(auth.uid(),'students.view') OR has_permission(auth.uid(),'students.attendance'));
CREATE POLICY "Write enrollments" ON public.enrollments FOR ALL TO authenticated USING (has_permission(auth.uid(),'students.edit')) WITH CHECK (has_permission(auth.uid(),'students.edit'));

DROP POLICY "Admins manage students" ON public.students;
CREATE POLICY "Read students" ON public.students FOR SELECT TO authenticated USING (has_permission(auth.uid(),'students.view') OR has_permission(auth.uid(),'students.attendance'));
CREATE POLICY "Write students" ON public.students FOR ALL TO authenticated USING (has_permission(auth.uid(),'students.edit')) WITH CHECK (has_permission(auth.uid(),'students.edit'));

DROP POLICY "Admins read student activity" ON public.student_activity;
CREATE POLICY "Read student activity" ON public.student_activity FOR SELECT TO authenticated USING (has_permission(auth.uid(),'students.view'));

DROP POLICY "Admins manage gallery" ON public.gallery_items;
CREATE POLICY "Create gallery" ON public.gallery_items FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(),'gallery.create'));
CREATE POLICY "Edit gallery" ON public.gallery_items FOR UPDATE TO authenticated USING (has_permission(auth.uid(),'gallery.edit')) WITH CHECK (has_permission(auth.uid(),'gallery.edit'));
CREATE POLICY "Delete gallery" ON public.gallery_items FOR DELETE TO authenticated USING (has_permission(auth.uid(),'gallery.delete'));

DROP POLICY "Admins delete translations" ON public.site_translations;
DROP POLICY "Admins edit translations" ON public.site_translations;
CREATE POLICY "Edit translations" ON public.site_translations FOR UPDATE TO authenticated USING (has_permission(auth.uid(),'translations.edit')) WITH CHECK (has_permission(auth.uid(),'translations.edit'));
CREATE POLICY "Delete translations" ON public.site_translations FOR DELETE TO authenticated USING (has_permission(auth.uid(),'translations.delete'));

-- content tables: courses / notices / partners
DROP POLICY "Admins manage courses" ON public.courses;
CREATE POLICY "Staff read courses" ON public.courses FOR SELECT TO authenticated USING (has_permission(auth.uid(),'courses.view'));
CREATE POLICY "Create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(),'courses.create'));
CREATE POLICY "Edit courses" ON public.courses FOR UPDATE TO authenticated USING (has_permission(auth.uid(),'courses.edit') OR has_permission(auth.uid(),'courses.publish')) WITH CHECK (has_permission(auth.uid(),'courses.edit') OR has_permission(auth.uid(),'courses.publish'));
CREATE POLICY "Delete courses" ON public.courses FOR DELETE TO authenticated USING (has_permission(auth.uid(),'courses.delete'));

DROP POLICY "Admins manage notices" ON public.notices;
CREATE POLICY "Staff read notices" ON public.notices FOR SELECT TO authenticated USING (has_permission(auth.uid(),'notices.view'));
CREATE POLICY "Create notices" ON public.notices FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(),'notices.create'));
CREATE POLICY "Edit notices" ON public.notices FOR UPDATE TO authenticated USING (has_permission(auth.uid(),'notices.edit') OR has_permission(auth.uid(),'notices.publish')) WITH CHECK (has_permission(auth.uid(),'notices.edit') OR has_permission(auth.uid(),'notices.publish'));
CREATE POLICY "Delete notices" ON public.notices FOR DELETE TO authenticated USING (has_permission(auth.uid(),'notices.delete'));

DROP POLICY "Admins manage partners" ON public.partners;
CREATE POLICY "Staff read partners" ON public.partners FOR SELECT TO authenticated USING (has_permission(auth.uid(),'partners.view'));
CREATE POLICY "Create partners" ON public.partners FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(),'partners.create'));
CREATE POLICY "Edit partners" ON public.partners FOR UPDATE TO authenticated USING (has_permission(auth.uid(),'partners.edit') OR has_permission(auth.uid(),'partners.publish')) WITH CHECK (has_permission(auth.uid(),'partners.edit') OR has_permission(auth.uid(),'partners.publish'));
CREATE POLICY "Delete partners" ON public.partners FOR DELETE TO authenticated USING (has_permission(auth.uid(),'partners.delete'));

CREATE OR REPLACE FUNCTION public.guard_publish() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE area text := TG_ARGV[0]; others boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published AND NOT has_permission(auth.uid(), area || '.publish') THEN RAISE EXCEPTION 'You do not have permission to publish'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.is_published IS DISTINCT FROM OLD.is_published AND NOT has_permission(auth.uid(), area || '.publish') THEN
    RAISE EXCEPTION 'You do not have permission to publish or unpublish'; END IF;
  others := (to_jsonb(NEW) - 'is_published' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'is_published' - 'updated_at');
  IF others AND NOT has_permission(auth.uid(), area || '.edit') THEN RAISE EXCEPTION 'You do not have permission to edit'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_publish_courses BEFORE INSERT OR UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.guard_publish('courses');
CREATE TRIGGER trg_guard_publish_notices BEFORE INSERT OR UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.guard_publish('notices');
CREATE TRIGGER trg_guard_publish_partners BEFORE INSERT OR UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.guard_publish('partners');

DROP POLICY "Own profile read" ON public.profiles;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR has_permission(auth.uid(),'users.view'));

DROP POLICY "Admins manage roles" ON public.user_roles;
DROP POLICY "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_permission(auth.uid(),'users.view'));

-- DB functions -> specific permissions
CREATE OR REPLACE FUNCTION public.approve_admission(_admission_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare a public.admissions; s_id uuid; code text;
begin
  if not public.has_permission(auth.uid(), 'applications.decide') then raise exception 'You do not have permission to approve applications'; end if;
  select * into a from public.admissions where id = _admission_id for update;
  if not found then raise exception 'Admission not found'; end if;
  select id, student_code into s_id, code from public.students where admission_id = a.id;
  if s_id is null then
    insert into public.students (admission_id, full_name, email, phone) values (a.id, a.full_name, a.email, a.phone) returning id, student_code into s_id, code;
  end if;
  if a.course_id is not null then
    insert into public.enrollments (student_id, course_id) values (s_id, a.course_id) on conflict do nothing;
  end if;
  update public.admissions set status = 'approved', reviewed_at = now() where id = a.id;
  return code;
end; $function$;

CREATE OR REPLACE FUNCTION public.issue_certificate(_enrollment_id uuid) RETURNS TABLE(certificate_id uuid, serial text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare e public.enrollments; c public.certificates;
begin
  if not public.has_permission(auth.uid(), 'certificates.generate') then raise exception 'You do not have permission to generate certificates'; end if;
  select * into e from public.enrollments where id = _enrollment_id for update;
  if not found then raise exception 'Enrollment not found'; end if;
  update public.enrollments set completed_at = coalesce(completed_at, now()) where id = e.id;
  select * into c from public.certificates where enrollment_id = e.id;
  if not found then
    insert into public.certificates (enrollment_id, student_id, course_id) values (e.id, e.student_id, e.course_id) returning * into c;
  end if;
  return query select c.id, c.serial;
end; $function$;

CREATE OR REPLACE FUNCTION public.log_admission_activity(_admission_id uuid, _action text, _detail jsonb DEFAULT '{}'::jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'applications.view') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _action IN ('approved','rejected') AND NOT public.has_permission(auth.uid(), 'applications.decide') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _action NOT IN ('viewed','downloaded_pdf','downloaded_document','viewed_document','approved','rejected') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  INSERT INTO public.admission_activity(admission_id, actor_id, actor_name, action, detail)
  VALUES (_admission_id, auth.uid(), public._actor_name(auth.uid()), _action, coalesce(_detail, '{}'::jsonb));
END $function$;

CREATE OR REPLACE FUNCTION public.log_student_activity(_student_id uuid, _action text, _detail jsonb DEFAULT '{}'::jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'students.view') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(_action) > 60 THEN RAISE EXCEPTION 'Invalid action'; END IF;
  INSERT INTO public.student_activity(student_id, actor_id, actor_name, action, detail)
  VALUES (_student_id, auth.uid(), public._actor_name(auth.uid()), _action, coalesce(_detail, '{}'::jsonb));
END $function$;

DO $$ DECLARE src text; BEGIN
  SELECT pg_get_functiondef('public.update_admission_with_log(uuid,jsonb,text)'::regprocedure) INTO src;
  src := replace(src, 'public.has_role(auth.uid(), ''admin'')', 'public.has_permission(auth.uid(), ''applications.edit'')');
  EXECUTE src;
END $$;
