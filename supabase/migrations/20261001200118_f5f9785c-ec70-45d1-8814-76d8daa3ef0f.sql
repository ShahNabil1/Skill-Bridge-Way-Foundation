create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  address text,
  avatar_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

create or replace function public.is_super_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users where id = _user_id and lower(email) = 'toolsai674@gmail.com')
$$;
revoke execute on function public.is_super_admin(uuid) from public, anon;
grant execute on function public.is_super_admin(uuid) to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  if lower(new.email) = 'toolsai674@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles (id, email) select id, email from auth.users on conflict (id) do nothing;
insert into public.user_roles (user_id, role)
  select id, 'admin' from auth.users where lower(email) = 'toolsai674@gmail.com' on conflict do nothing;

create or replace function public.protect_super_admin_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and public.is_super_admin(old.user_id) then
    raise exception 'The Super Admin role cannot be removed';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end; $$;
revoke execute on function public.protect_super_admin_role() from public, anon, authenticated;
create trigger trg_protect_super_admin before delete or update on public.user_roles for each row execute function public.protect_super_admin_role();

create or replace function public.approve_admission(_admission_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare a public.admissions; s_id uuid; code text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into a from public.admissions where id = _admission_id for update;
  if not found then raise exception 'Admission not found'; end if;
  select id, student_code into s_id, code from public.students where admission_id = a.id;
  if s_id is null then
    insert into public.students (admission_id, full_name, email, phone)
    values (a.id, a.full_name, a.email, a.phone) returning id, student_code into s_id, code;
  end if;
  if a.course_id is not null then
    insert into public.enrollments (student_id, course_id) values (s_id, a.course_id) on conflict do nothing;
  end if;
  update public.admissions set status = 'approved', reviewed_at = now() where id = a.id;
  return code;
end; $$;
revoke execute on function public.approve_admission(uuid) from public, anon;
grant execute on function public.approve_admission(uuid) to authenticated;