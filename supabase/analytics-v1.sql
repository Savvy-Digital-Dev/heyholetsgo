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

create index if not exists idx_analytics_sessions_user_started on public.analytics_sessions(user_id, started_at);
create index if not exists idx_app_events_user_created on public.app_events(user_id, created_at);
create index if not exists idx_app_events_name_created on public.app_events(event_name, created_at);
create index if not exists idx_analytics_daily_user_date on public.analytics_daily_summaries(user_id, summary_date);
create index if not exists idx_product_insights_status_created on public.product_insights(status, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

drop trigger if exists set_analytics_daily_summaries_updated_at on public.analytics_daily_summaries;
create trigger set_analytics_daily_summaries_updated_at before update on public.analytics_daily_summaries
for each row execute function public.set_updated_at();

drop trigger if exists set_product_insights_updated_at on public.product_insights;
create trigger set_product_insights_updated_at before update on public.product_insights
for each row execute function public.set_updated_at();

alter table public.analytics_sessions enable row level security;
alter table public.app_events enable row level security;
alter table public.analytics_daily_summaries enable row level security;
alter table public.product_insights enable row level security;

drop policy if exists "analytics_sessions_insert_own" on public.analytics_sessions;
create policy "analytics_sessions_insert_own"
on public.analytics_sessions for insert
to authenticated
with check (public.current_user_is_active() and user_id = auth.uid());

drop policy if exists "analytics_sessions_select_visible" on public.analytics_sessions;
create policy "analytics_sessions_select_visible"
on public.analytics_sessions for select
to authenticated
using (public.is_admin_or_superuser() and (user_id = auth.uid() or public.can_manage_user(user_id)));

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
