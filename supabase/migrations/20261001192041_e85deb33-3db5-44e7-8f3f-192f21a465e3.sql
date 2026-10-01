create type public.app_role as enum ('admin','moderator','user');
create type public.admission_status as enum ('pending','approved','rejected');
create type public.notice_type as enum ('notice','event');

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;

create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users see own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.courses (id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, summary text, description text, category text, duration text, level text, cover_image_key text, is_published boolean not null default false, sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select on public.courses to anon, authenticated; grant insert, update, delete on public.courses to authenticated; grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "Public read published courses" on public.courses for select to anon, authenticated using (is_published or public.has_role(auth.uid(),'admin'));
create policy "Admins manage courses" on public.courses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_courses_updated before update on public.courses for each row execute function public.update_updated_at_column();

create table public.notices (id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, body text, type notice_type not null default 'notice', event_date timestamptz, is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select on public.notices to anon, authenticated; grant insert, update, delete on public.notices to authenticated; grant all on public.notices to service_role;
alter table public.notices enable row level security;
create policy "Public read published notices" on public.notices for select to anon, authenticated using (is_published or public.has_role(auth.uid(),'admin'));
create policy "Admins manage notices" on public.notices for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_notices_updated before update on public.notices for each row execute function public.update_updated_at_column();

create table public.gallery_items (id uuid primary key default gen_random_uuid(), title text, image_key text not null, category text, created_at timestamptz not null default now());
grant select on public.gallery_items to anon, authenticated; grant insert, update, delete on public.gallery_items to authenticated; grant all on public.gallery_items to service_role;
alter table public.gallery_items enable row level security;
create policy "Public read gallery" on public.gallery_items for select to anon, authenticated using (true);
create policy "Admins manage gallery" on public.gallery_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.contact_messages (id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text, subject text, message text not null, is_read boolean not null default false, created_at timestamptz not null default now());
grant insert on public.contact_messages to anon, authenticated; grant select, update, delete on public.contact_messages to authenticated; grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create policy "Anyone can send message" on public.contact_messages for insert to anon, authenticated with check (length(name) between 1 and 120 and length(message) between 1 and 5000 and is_read = false);
create policy "Admins read messages" on public.contact_messages for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update messages" on public.contact_messages for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins delete messages" on public.contact_messages for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.admissions (id uuid primary key default gen_random_uuid(), full_name text not null, email text not null, phone text not null, date_of_birth date, gender text, address text, education_level text, institution text, course_id uuid references public.courses(id) on delete set null, motivation text, document_keys jsonb not null default '[]'::jsonb, status admission_status not null default 'pending', review_note text, reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant insert on public.admissions to anon, authenticated; grant select, update, delete on public.admissions to authenticated; grant all on public.admissions to service_role;
alter table public.admissions enable row level security;
create policy "Anyone can apply" on public.admissions for insert to anon, authenticated with check (status = 'pending' and review_note is null and reviewed_at is null);
create policy "Admins read admissions" on public.admissions for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update admissions" on public.admissions for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins delete admissions" on public.admissions for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger trg_admissions_updated before update on public.admissions for each row execute function public.update_updated_at_column();

create sequence public.student_id_seq;
create table public.students (id uuid primary key default gen_random_uuid(), student_code text not null unique default ('SBF-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.student_id_seq')::text, 4, '0')), admission_id uuid unique references public.admissions(id) on delete set null, full_name text not null, email text not null, phone text, created_at timestamptz not null default now());
grant select, insert, update, delete on public.students to authenticated; grant all on public.students to service_role; grant usage on sequence public.student_id_seq to authenticated, service_role;
alter table public.students enable row level security;
create policy "Admins manage students" on public.students for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.enrollments (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade, course_id uuid not null references public.courses(id) on delete cascade, completed_at timestamptz, created_at timestamptz not null default now(), unique(student_id, course_id));
grant select, insert, update, delete on public.enrollments to authenticated; grant all on public.enrollments to service_role;
alter table public.enrollments enable row level security;
create policy "Admins manage enrollments" on public.enrollments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create sequence public.certificate_serial_seq;
create table public.certificates (id uuid primary key default gen_random_uuid(), serial text not null unique default ('SBF-CERT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.certificate_serial_seq')::text, 6, '0')), enrollment_id uuid unique references public.enrollments(id) on delete set null, student_id uuid not null references public.students(id) on delete cascade, course_id uuid references public.courses(id) on delete set null, issued_at timestamptz not null default now(), pdf_key text, is_revoked boolean not null default false, created_at timestamptz not null default now());
grant select, insert, update, delete on public.certificates to authenticated; grant all on public.certificates to service_role; grant usage on sequence public.certificate_serial_seq to authenticated, service_role;
alter table public.certificates enable row level security;
create policy "Admins manage certificates" on public.certificates for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.verify_certificate(_serial text)
returns table (serial text, student_name text, student_code text, course_title text, issued_at timestamptz, is_revoked boolean)
language sql stable security definer set search_path = public as $$
  select c.serial, s.full_name, s.student_code, co.title, c.issued_at, c.is_revoked
  from public.certificates c join public.students s on s.id = c.student_id left join public.courses co on co.id = c.course_id
  where c.serial = upper(trim(_serial)) limit 1
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;