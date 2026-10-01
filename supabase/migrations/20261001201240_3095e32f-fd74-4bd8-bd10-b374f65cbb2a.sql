create or replace function public.issue_certificate(_enrollment_id uuid)
returns table(certificate_id uuid, serial text)
language plpgsql security definer set search_path = public as $$
declare e public.enrollments; c public.certificates;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into e from public.enrollments where id = _enrollment_id for update;
  if not found then raise exception 'Enrollment not found'; end if;
  update public.enrollments set completed_at = coalesce(completed_at, now()) where id = e.id;
  select * into c from public.certificates where enrollment_id = e.id;
  if not found then
    insert into public.certificates (enrollment_id, student_id, course_id)
    values (e.id, e.student_id, e.course_id) returning * into c;
  end if;
  return query select c.id, c.serial;
end; $$;
revoke execute on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.issue_certificate(uuid) to authenticated;

drop function if exists public.verify_certificate(text);
create function public.verify_certificate(_serial text)
returns table(serial text, student_name text, student_code text, course_title text, issued_at timestamptz, is_revoked boolean, pdf_key text)
language sql stable security definer set search_path = public as $$
  select c.serial, s.full_name, s.student_code, co.title, c.issued_at, c.is_revoked, c.pdf_key
  from public.certificates c join public.students s on s.id = c.student_id left join public.courses co on co.id = c.course_id
  where c.serial = upper(trim(_serial)) limit 1
$$;
revoke execute on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;