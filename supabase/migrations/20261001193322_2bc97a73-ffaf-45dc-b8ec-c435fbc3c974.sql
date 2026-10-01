drop policy "Public read published courses" on public.courses;
create policy "Public read published courses" on public.courses for select to anon, authenticated using (is_published);
drop policy "Public read published notices" on public.notices;
create policy "Public read published notices" on public.notices for select to anon, authenticated using (is_published);