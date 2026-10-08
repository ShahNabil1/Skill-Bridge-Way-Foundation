create table public.site_translations (
  id uuid primary key default gen_random_uuid(),
  source_hash text not null,
  source text not null,
  lang text not null check (lang in ('bn','en')),
  translated text not null,
  manual boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (source_hash, lang)
);
grant select on public.site_translations to anon;
grant select, update, delete on public.site_translations to authenticated;
grant all on public.site_translations to service_role;
alter table public.site_translations enable row level security;
create policy "Public read translations" on public.site_translations for select to anon, authenticated using (true);
create policy "Admins edit translations" on public.site_translations for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete translations" on public.site_translations for delete to authenticated using (public.has_role(auth.uid(),'admin'));