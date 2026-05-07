alter table public.tasks
add column if not exists deadline_at timestamptz;

with duplicates as (
  select id,
    row_number() over (
      partition by owner_id, client_id
      order by updated_at desc nulls last, created_at desc nulls last, id
    ) as rn
  from public.tasks
  where client_id is not null
)
delete from public.tasks t
using duplicates d
where t.id = d.id
  and d.rn > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_owner_client_id_unique'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
    add constraint tasks_owner_client_id_unique unique (owner_id, client_id);
  end if;
end $$;

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

create index if not exists idx_tasks_owner_status_deadline
on public.tasks(owner_id, status, deadline_at);

create index if not exists idx_task_daily_updates_user_date
on public.task_daily_updates(user_id, update_date);

create index if not exists idx_task_daily_updates_task_date
on public.task_daily_updates(task_id, update_date);

drop trigger if exists set_task_daily_updates_updated_at on public.task_daily_updates;
create trigger set_task_daily_updates_updated_at before update on public.task_daily_updates
for each row execute function public.set_updated_at();

alter table public.task_daily_updates enable row level security;

drop policy if exists "task_daily_updates_select_visible" on public.task_daily_updates;
create policy "task_daily_updates_select_visible"
on public.task_daily_updates for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_manage_user(user_id)
);

drop policy if exists "task_daily_updates_insert_own" on public.task_daily_updates;
create policy "task_daily_updates_insert_own"
on public.task_daily_updates for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and t.owner_id = auth.uid()
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
    where t.id = task_id
      and t.owner_id = auth.uid()
  )
);
