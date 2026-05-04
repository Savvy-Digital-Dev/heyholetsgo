-- HoHo v2 manager hierarchy tightening.
-- Run after dashboard-migration.sql.

drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_superuser()
  or (public.current_user_role() = 'admin' and manager_id = auth.uid())
  or status = 'active'
);

-- Optional helper query after assigning a manager:
-- select p.email, p.role, m.email as manager_email
-- from public.profiles p
-- left join public.profiles m on m.id = p.manager_id
-- order by p.created_at;
