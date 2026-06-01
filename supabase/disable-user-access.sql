create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid() and status = 'active'), 'anon');
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

drop policy if exists "profiles_update_allowed" on public.profiles;
create policy "profiles_update_allowed"
on public.profiles for update
to authenticated
using (public.current_user_is_active() and (id = auth.uid() or public.is_superuser() or public.can_manage_user(id)))
with check (public.current_user_is_active() and (id = auth.uid() or public.is_superuser() or public.can_manage_user(id)));

create or replace function public.admin_update_task_effort(target_task_id uuid, new_effort int)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task public.tasks;
  updated_task public.tasks;
begin
  if new_effort not in (1, 2, 3) then
    raise exception 'Effort must be 1, 2, or 3.';
  end if;

  select * into target_task from public.tasks where id = target_task_id;
  if target_task.id is null then
    raise exception 'Task not found.';
  end if;

  if not (
    public.current_user_is_active()
    and (
      target_task.owner_id = auth.uid()
      or target_task.created_by = auth.uid()
      or public.can_manage_user(target_task.owner_id)
    )
  ) then
    raise exception 'Not allowed to update this task effort.';
  end if;

  update public.tasks
  set effort = new_effort,
      updated_at = now()
  where id = target_task_id
  returning * into updated_task;

  update public.task_daily_updates
  set xp = public.task_xp_for_effort_status(new_effort, status),
      updated_at = now()
  where task_id = target_task_id;

  return updated_task;
end;
$$;

grant execute on function public.admin_update_task_effort(uuid, int) to authenticated;

drop policy if exists "tasks_select_visible" on public.tasks;
create policy "tasks_select_visible"
on public.tasks for select
to authenticated
using (public.current_user_is_active() and (
  owner_id = auth.uid()
  or created_by = auth.uid()
  or public.can_manage_user(owner_id)
));

drop policy if exists "tasks_insert_allowed" on public.tasks;
create policy "tasks_insert_allowed"
on public.tasks for insert
to authenticated
with check (public.current_user_is_active() and (
  (owner_id = auth.uid() and created_by = auth.uid())
  or public.can_manage_user(owner_id)
  or (source = 'delegated' and created_by = auth.uid() and public.can_delegate_to(owner_id))
));

drop policy if exists "tasks_update_allowed" on public.tasks;
create policy "tasks_update_allowed"
on public.tasks for update
to authenticated
using (public.current_user_is_active() and (owner_id = auth.uid() or created_by = auth.uid() or public.can_manage_user(owner_id)))
with check (public.current_user_is_active() and (owner_id = auth.uid() or created_by = auth.uid() or public.can_manage_user(owner_id)));

drop policy if exists "tasks_delete_allowed" on public.tasks;
create policy "tasks_delete_allowed"
on public.tasks for delete
to authenticated
using (public.current_user_is_active() and (owner_id = auth.uid() or created_by = auth.uid() or public.can_manage_user(owner_id)));

drop policy if exists "task_daily_updates_select_visible" on public.task_daily_updates;
create policy "task_daily_updates_select_visible"
on public.task_daily_updates for select
to authenticated
using (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "task_daily_updates_insert_own" on public.task_daily_updates;
create policy "task_daily_updates_insert_own"
on public.task_daily_updates for insert
to authenticated
with check (
  public.current_user_is_active()
  and user_id = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.owner_id = auth.uid()
  )
);

drop policy if exists "task_daily_updates_update_own" on public.task_daily_updates;
create policy "task_daily_updates_update_own"
on public.task_daily_updates for update
to authenticated
using (public.current_user_is_active() and user_id = auth.uid())
with check (
  public.current_user_is_active()
  and user_id = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.owner_id = auth.uid()
  )
);

drop policy if exists "learning_entries_access" on public.learning_entries;
create policy "learning_entries_access"
on public.learning_entries for all
to authenticated
using (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)))
with check (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "fourdx_goals_access" on public.fourdx_goals;
create policy "fourdx_goals_access"
on public.fourdx_goals for all
to authenticated
using (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)))
with check (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "fourdx_lead_measures_access" on public.fourdx_lead_measures;
create policy "fourdx_lead_measures_access"
on public.fourdx_lead_measures for all
to authenticated
using (
  exists (
    select 1 from public.fourdx_goals g
    where public.current_user_is_active() and g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
)
with check (
  exists (
    select 1 from public.fourdx_goals g
    where public.current_user_is_active() and g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
);

drop policy if exists "fourdx_lag_measures_access" on public.fourdx_lag_measures;
create policy "fourdx_lag_measures_access"
on public.fourdx_lag_measures for all
to authenticated
using (
  exists (
    select 1 from public.fourdx_goals g
    where public.current_user_is_active() and g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
)
with check (
  exists (
    select 1 from public.fourdx_goals g
    where public.current_user_is_active() and g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
);

drop policy if exists "fourdx_checkins_access" on public.fourdx_checkins;
create policy "fourdx_checkins_access"
on public.fourdx_checkins for all
to authenticated
using (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)))
with check (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "fourdx_offdays_access" on public.fourdx_offdays;
create policy "fourdx_offdays_access"
on public.fourdx_offdays for all
to authenticated
using (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)))
with check (public.current_user_is_active() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "analytics_sessions_insert_own" on public.analytics_sessions;
create policy "analytics_sessions_insert_own"
on public.analytics_sessions for insert
to authenticated
with check (public.current_user_is_active() and user_id = auth.uid());

drop policy if exists "analytics_sessions_update_own" on public.analytics_sessions;
create policy "analytics_sessions_update_own"
on public.analytics_sessions for update
to authenticated
using (public.current_user_is_active() and user_id = auth.uid())
with check (public.current_user_is_active() and user_id = auth.uid());

drop policy if exists "app_events_insert_own" on public.app_events;
create policy "app_events_insert_own"
on public.app_events for insert
to authenticated
with check (public.current_user_is_active() and user_id = auth.uid());
