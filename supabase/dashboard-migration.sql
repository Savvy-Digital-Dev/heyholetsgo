-- HoHo v2 dashboard + one-time Google Sheet legacy import.
-- Run this after the original schema.sql.

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

create index if not exists idx_legacy_task_learning_period
on public.legacy_task_learning_weekly_summaries(week_start, week_end);

create index if not exists idx_legacy_task_learning_user_email
on public.legacy_task_learning_weekly_summaries(lower(user_email));

create index if not exists idx_legacy_fourdx_period
on public.legacy_fourdx_weekly_summaries(week_start, week_end);

create index if not exists idx_legacy_fourdx_user_email
on public.legacy_fourdx_weekly_summaries(lower(user_email));

alter table public.legacy_task_learning_weekly_summaries enable row level security;
alter table public.legacy_fourdx_weekly_summaries enable row level security;

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
