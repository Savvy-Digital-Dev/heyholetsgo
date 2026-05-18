-- HoHo v2 Supabase schema
-- Run this in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  position text,
  role text not null default 'regular_user',
  manager_id uuid references public.profiles(id) on delete set null,
  delegation_enabled boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('superuser', 'admin', 'regular_user')),
  constraint profiles_status_check check (status in ('active', 'pending', 'disabled'))
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (role, permission)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  delegated_from_task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  effort int not null default 1,
  status text not null default 'none',
  task_date date not null,
  source text not null default 'self',
  deadline_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_effort_check check (effort in (1, 2, 3)),
  constraint tasks_status_check check (status in ('none', 'progress', 'done', 'blocked')),
  constraint tasks_source_check check (source in ('self', 'assigned', 'delegated')),
  constraint tasks_owner_client_id_unique unique (owner_id, client_id)
);

create table if not exists public.task_daily_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  update_date date not null,
  status text not null,
  xp int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_daily_updates_status_check check (status in ('progress', 'done')),
  constraint task_daily_updates_xp_check check (xp >= 0),
  constraint task_daily_updates_unique unique (task_id, user_id, update_date)
);

create table if not exists public.learning_entries (
  id uuid primary key default gen_random_uuid(),
  client_id text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'other',
  subskill text,
  effort int not null default 1,
  reflection text,
  entry_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_effort_check check (effort in (1, 2, 3))
);

create table if not exists public.fourdx_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wig text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.fourdx_lead_measures (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.fourdx_goals(id) on delete cascade,
  name text not null,
  active_from date not null default current_date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fourdx_lag_measures (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.fourdx_goals(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fourdx_checkins (
  id uuid primary key default gen_random_uuid(),
  lead_measure_id uuid not null references public.fourdx_lead_measures(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_measure_id, checkin_date),
  constraint fourdx_checkins_status_check check (status in ('RED', 'YELLOW', 'GREEN'))
);

create table if not exists public.fourdx_offdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  offday_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, offday_date)
);

create table if not exists public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  device_info jsonb not null default '{}'::jsonb
);

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.analytics_sessions(id) on delete set null,
  event_name text not null,
  feature_area text not null default 'general',
  entity_type text,
  entity_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  summary_date date not null,
  active_session_count int not null default 0,
  event_count int not null default 0,
  task_created int not null default 0,
  task_done int not null default 0,
  task_deleted int not null default 0,
  learning_created int not null default 0,
  fourdx_checkin int not null default 0,
  overdue_seen int not null default 0,
  effort_corrections int not null default 0,
  total_active_seconds int not null default 0,
  feature_time_seconds jsonb not null default '{}'::jsonb,
  feature_usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, summary_date)
);

create table if not exists public.product_insights (
  id uuid primary key default gen_random_uuid(),
  insight_type text not null,
  severity text not null default 'info',
  title text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  suggested_action text,
  status text not null default 'open',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_insights_severity_check check (severity in ('info', 'warning', 'critical')),
  constraint product_insights_status_check check (status in ('open', 'reviewing', 'done', 'dismissed'))
);

alter table public.analytics_daily_summaries
add column if not exists total_active_seconds int not null default 0;

alter table public.analytics_daily_summaries
add column if not exists feature_time_seconds jsonb not null default '{}'::jsonb;

create table if not exists public.legacy_task_learning_weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  legacy_source text not null default 'google_sheet_task_learning',
  legacy_imported_at timestamptz not null default now(),
  legacy_row_hash text not null unique,
  user_name text,
  user_email text,
  position text,
  week_start date not null,
  week_end date not null,
  row_date date,
  task_percent int not null default 0,
  task_xp int not null default 0,
  task_done int not null default 0,
  task_progress int not null default 0,
  task_blocked int not null default 0,
  learning_xp int not null default 0,
  learning_entries int not null default 0,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.legacy_fourdx_weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  legacy_source text not null default 'google_sheet_4dx',
  legacy_imported_at timestamptz not null default now(),
  legacy_row_hash text not null unique,
  user_name text,
  user_email text,
  user_position text,
  week_start date not null,
  week_end date not null,
  lead_name text,
  active_from date,
  expected_days int not null default 0,
  filled_days int not null default 0,
  miss_days int not null default 0,
  off_days int not null default 0,
  green_days int not null default 0,
  yellow_days int not null default 0,
  red_days int not null default 0,
  green_pct int not null default 0,
  completion_pct int not null default 0,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_manager_id on public.profiles(manager_id);
create index if not exists idx_tasks_owner_date on public.tasks(owner_id, task_date);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_tasks_owner_status_deadline on public.tasks(owner_id, status, deadline_at);
create index if not exists idx_task_daily_updates_user_date on public.task_daily_updates(user_id, update_date);
create index if not exists idx_task_daily_updates_task_date on public.task_daily_updates(task_id, update_date);
create index if not exists idx_learning_user_date on public.learning_entries(user_id, entry_date);
create index if not exists idx_fourdx_goals_user on public.fourdx_goals(user_id);
create index if not exists idx_fourdx_checkins_user_date on public.fourdx_checkins(user_id, checkin_date);
create index if not exists idx_fourdx_offdays_user_date on public.fourdx_offdays(user_id, offday_date);
create index if not exists idx_analytics_sessions_user_started on public.analytics_sessions(user_id, started_at);
create index if not exists idx_app_events_user_created on public.app_events(user_id, created_at);
create index if not exists idx_app_events_name_created on public.app_events(event_name, created_at);
create index if not exists idx_analytics_daily_user_date on public.analytics_daily_summaries(user_id, summary_date);
create index if not exists idx_product_insights_status_created on public.product_insights(status, created_at);
create index if not exists idx_legacy_task_learning_period on public.legacy_task_learning_weekly_summaries(week_start, week_end);
create index if not exists idx_legacy_task_learning_user_email on public.legacy_task_learning_weekly_summaries(lower(user_email));
create index if not exists idx_legacy_fourdx_period on public.legacy_fourdx_weekly_summaries(week_start, week_end);
create index if not exists idx_legacy_fourdx_user_email on public.legacy_fourdx_weekly_summaries(lower(user_email));

create or replace function public.cleanup_old_app_events(retention_days int default 180)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  if not public.is_superuser() then
    raise exception 'Only superuser can cleanup analytics events.';
  end if;

  delete from public.app_events
  where created_at < now() - make_interval(days => retention_days);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_old_app_events(int) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_task_daily_updates_updated_at on public.task_daily_updates;
create trigger set_task_daily_updates_updated_at before update on public.task_daily_updates
for each row execute function public.set_updated_at();

drop trigger if exists set_learning_entries_updated_at on public.learning_entries;
create trigger set_learning_entries_updated_at before update on public.learning_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_fourdx_goals_updated_at on public.fourdx_goals;
create trigger set_fourdx_goals_updated_at before update on public.fourdx_goals
for each row execute function public.set_updated_at();

drop trigger if exists set_fourdx_lead_measures_updated_at on public.fourdx_lead_measures;
create trigger set_fourdx_lead_measures_updated_at before update on public.fourdx_lead_measures
for each row execute function public.set_updated_at();

drop trigger if exists set_fourdx_lag_measures_updated_at on public.fourdx_lag_measures;
create trigger set_fourdx_lag_measures_updated_at before update on public.fourdx_lag_measures
for each row execute function public.set_updated_at();

drop trigger if exists set_fourdx_checkins_updated_at on public.fourdx_checkins;
create trigger set_fourdx_checkins_updated_at before update on public.fourdx_checkins
for each row execute function public.set_updated_at();

drop trigger if exists set_analytics_daily_summaries_updated_at on public.analytics_daily_summaries;
create trigger set_analytics_daily_summaries_updated_at before update on public.analytics_daily_summaries
for each row execute function public.set_updated_at();

drop trigger if exists set_product_insights_updated_at on public.product_insights;
create trigger set_product_insights_updated_at before update on public.product_insights
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

create or replace function public.is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'superuser';
$$;

create or replace function public.is_admin_or_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'superuser');
$$;

create or replace function public.can_manage_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_user_id = auth.uid()
    or public.is_superuser()
    or exists (
      select 1
      from public.profiles p
      where p.id = target_user_id
        and p.manager_id = auth.uid()
        and public.current_user_role() = 'admin'
    );
$$;

create or replace function public.can_delegate_to(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and target_user_id <> auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.delegation_enabled = true
    )
    and exists (
      select 1
      from public.profiles target
      where target.id = target_user_id
        and target.status = 'active'
    );
$$;

create or replace function public.task_xp_for_effort_status(task_effort int, task_status text)
returns int
language sql
immutable
as $$
  select case
    when task_status = 'done' then
      case task_effort when 1 then 10 when 2 then 20 when 3 then 30 else 0 end
    when task_status = 'progress' then
      round((case task_effort when 1 then 10 when 2 then 20 when 3 then 30 else 0 end) * 0.2)::int
    else 0
  end;
$$;

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
    target_task.owner_id = auth.uid()
    or target_task.created_by = auth.uid()
    or public.can_manage_user(target_task.owner_id)
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

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'superuser' then
    if new.role is distinct from old.role
      or new.manager_id is distinct from old.manager_id
      or new.status is distinct from old.status
      or new.delegation_enabled is distinct from old.delegation_enabled then
      raise exception 'Only superuser can change role, manager, status, or delegation settings.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields before update on public.profiles
for each row execute function public.protect_profile_privileged_fields();

alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_daily_updates enable row level security;
alter table public.learning_entries enable row level security;
alter table public.fourdx_goals enable row level security;
alter table public.fourdx_lead_measures enable row level security;
alter table public.fourdx_lag_measures enable row level security;
alter table public.fourdx_checkins enable row level security;
alter table public.fourdx_offdays enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.app_events enable row level security;
alter table public.analytics_daily_summaries enable row level security;
alter table public.product_insights enable row level security;
alter table public.legacy_task_learning_weekly_summaries enable row level security;
alter table public.legacy_fourdx_weekly_summaries enable row level security;

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

drop policy if exists "profiles_insert_own_regular" on public.profiles;
create policy "profiles_insert_own_regular"
on public.profiles for insert
to authenticated
with check (
  (id = auth.uid() and role = 'regular_user' and status in ('active', 'pending'))
  or public.is_superuser()
);

drop policy if exists "profiles_update_allowed" on public.profiles;
create policy "profiles_update_allowed"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_superuser() or public.can_manage_user(id))
with check (id = auth.uid() or public.is_superuser() or public.can_manage_user(id));

drop policy if exists "role_permissions_superuser_all" on public.role_permissions;
create policy "role_permissions_superuser_all"
on public.role_permissions for all
to authenticated
using (public.is_superuser())
with check (public.is_superuser());

drop policy if exists "role_permissions_read_active" on public.role_permissions;
create policy "role_permissions_read_active"
on public.role_permissions for select
to authenticated
using (enabled = true);

drop policy if exists "tasks_select_visible" on public.tasks;
create policy "tasks_select_visible"
on public.tasks for select
to authenticated
using (
  owner_id = auth.uid()
  or created_by = auth.uid()
  or public.can_manage_user(owner_id)
);

drop policy if exists "tasks_insert_allowed" on public.tasks;
create policy "tasks_insert_allowed"
on public.tasks for insert
to authenticated
with check (
  (owner_id = auth.uid() and created_by = auth.uid())
  or public.can_manage_user(owner_id)
  or (source = 'delegated' and created_by = auth.uid() and public.can_delegate_to(owner_id))
);

drop policy if exists "tasks_update_allowed" on public.tasks;
create policy "tasks_update_allowed"
on public.tasks for update
to authenticated
using (owner_id = auth.uid() or created_by = auth.uid() or public.can_manage_user(owner_id))
with check (owner_id = auth.uid() or created_by = auth.uid() or public.can_manage_user(owner_id));

drop policy if exists "tasks_delete_allowed" on public.tasks;
create policy "tasks_delete_allowed"
on public.tasks for delete
to authenticated
using (owner_id = auth.uid() or created_by = auth.uid() or public.can_manage_user(owner_id));

drop policy if exists "task_daily_updates_select_visible" on public.task_daily_updates;
create policy "task_daily_updates_select_visible"
on public.task_daily_updates for select
to authenticated
using (user_id = auth.uid() or public.can_manage_user(user_id));

drop policy if exists "task_daily_updates_insert_own" on public.task_daily_updates;
create policy "task_daily_updates_insert_own"
on public.task_daily_updates for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.owner_id = auth.uid()
  )
);

drop policy if exists "task_daily_updates_update_own" on public.task_daily_updates;
create policy "task_daily_updates_update_own"
on public.task_daily_updates for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.owner_id = auth.uid()
  )
);

drop policy if exists "learning_entries_access" on public.learning_entries;
create policy "learning_entries_access"
on public.learning_entries for all
to authenticated
using (user_id = auth.uid() or public.can_manage_user(user_id))
with check (user_id = auth.uid() or public.can_manage_user(user_id));

drop policy if exists "fourdx_goals_access" on public.fourdx_goals;
create policy "fourdx_goals_access"
on public.fourdx_goals for all
to authenticated
using (user_id = auth.uid() or public.can_manage_user(user_id))
with check (user_id = auth.uid() or public.can_manage_user(user_id));

drop policy if exists "fourdx_lead_measures_access" on public.fourdx_lead_measures;
create policy "fourdx_lead_measures_access"
on public.fourdx_lead_measures for all
to authenticated
using (
  exists (
    select 1 from public.fourdx_goals g
    where g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
)
with check (
  exists (
    select 1 from public.fourdx_goals g
    where g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
);

drop policy if exists "fourdx_lag_measures_access" on public.fourdx_lag_measures;
create policy "fourdx_lag_measures_access"
on public.fourdx_lag_measures for all
to authenticated
using (
  exists (
    select 1 from public.fourdx_goals g
    where g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
)
with check (
  exists (
    select 1 from public.fourdx_goals g
    where g.id = goal_id and (g.user_id = auth.uid() or public.can_manage_user(g.user_id))
  )
);

drop policy if exists "fourdx_checkins_access" on public.fourdx_checkins;
create policy "fourdx_checkins_access"
on public.fourdx_checkins for all
to authenticated
using (user_id = auth.uid() or public.can_manage_user(user_id))
with check (user_id = auth.uid() or public.can_manage_user(user_id));

drop policy if exists "fourdx_offdays_access" on public.fourdx_offdays;
create policy "fourdx_offdays_access"
on public.fourdx_offdays for all
to authenticated
using (user_id = auth.uid() or public.can_manage_user(user_id))
with check (user_id = auth.uid() or public.can_manage_user(user_id));

drop policy if exists "analytics_sessions_insert_own" on public.analytics_sessions;
create policy "analytics_sessions_insert_own"
on public.analytics_sessions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "analytics_sessions_select_visible" on public.analytics_sessions;
create policy "analytics_sessions_select_visible"
on public.analytics_sessions for select
to authenticated
using (public.is_admin_or_superuser() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "analytics_sessions_update_own" on public.analytics_sessions;
create policy "analytics_sessions_update_own"
on public.analytics_sessions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "app_events_insert_own" on public.app_events;
create policy "app_events_insert_own"
on public.app_events for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "app_events_select_visible" on public.app_events;
create policy "app_events_select_visible"
on public.app_events for select
to authenticated
using (public.is_admin_or_superuser() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "analytics_daily_summaries_select_visible" on public.analytics_daily_summaries;
create policy "analytics_daily_summaries_select_visible"
on public.analytics_daily_summaries for select
to authenticated
using (public.is_admin_or_superuser() and (user_id = auth.uid() or public.can_manage_user(user_id)));

drop policy if exists "analytics_daily_summaries_superuser_write" on public.analytics_daily_summaries;
create policy "analytics_daily_summaries_superuser_write"
on public.analytics_daily_summaries for all
to authenticated
using (public.is_superuser())
with check (public.is_superuser());

drop policy if exists "product_insights_select_admin" on public.product_insights;
create policy "product_insights_select_admin"
on public.product_insights for select
to authenticated
using (public.is_admin_or_superuser());

drop policy if exists "product_insights_write_admin" on public.product_insights;
create policy "product_insights_write_admin"
on public.product_insights for all
to authenticated
using (public.is_admin_or_superuser())
with check (public.is_admin_or_superuser());

drop policy if exists "legacy_task_learning_dashboard_read" on public.legacy_task_learning_weekly_summaries;
create policy "legacy_task_learning_dashboard_read"
on public.legacy_task_learning_weekly_summaries for select
to authenticated
using (public.is_admin_or_superuser());

drop policy if exists "legacy_task_learning_superuser_write" on public.legacy_task_learning_weekly_summaries;
create policy "legacy_task_learning_superuser_write"
on public.legacy_task_learning_weekly_summaries for insert
to authenticated
with check (public.is_superuser());

drop policy if exists "legacy_task_learning_superuser_update" on public.legacy_task_learning_weekly_summaries;
create policy "legacy_task_learning_superuser_update"
on public.legacy_task_learning_weekly_summaries for update
to authenticated
using (public.is_superuser())
with check (public.is_superuser());

drop policy if exists "legacy_fourdx_dashboard_read" on public.legacy_fourdx_weekly_summaries;
create policy "legacy_fourdx_dashboard_read"
on public.legacy_fourdx_weekly_summaries for select
to authenticated
using (public.is_admin_or_superuser());

drop policy if exists "legacy_fourdx_superuser_write" on public.legacy_fourdx_weekly_summaries;
create policy "legacy_fourdx_superuser_write"
on public.legacy_fourdx_weekly_summaries for insert
to authenticated
with check (public.is_superuser());

drop policy if exists "legacy_fourdx_superuser_update" on public.legacy_fourdx_weekly_summaries;
create policy "legacy_fourdx_superuser_update"
on public.legacy_fourdx_weekly_summaries for update
to authenticated
using (public.is_superuser())
with check (public.is_superuser());

insert into public.role_permissions (role, permission, enabled)
values
  ('superuser', 'manage_roles', true),
  ('superuser', 'manage_users', true),
  ('superuser', 'view_all_data', true),
  ('admin', 'manage_team_users', true),
  ('admin', 'assign_tasks', true),
  ('admin', 'view_team_data', true),
  ('regular_user', 'create_own_tasks', true),
  ('regular_user', 'delegate_tasks', true)
on conflict (role, permission) do update set enabled = excluded.enabled;
