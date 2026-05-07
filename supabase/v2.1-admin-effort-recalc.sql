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

  select *
  into target_task
  from public.tasks
  where id = target_task_id;

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
  returning *
  into updated_task;

  update public.task_daily_updates
  set xp = public.task_xp_for_effort_status(new_effort, status),
      updated_at = now()
  where task_id = target_task_id;

  return updated_task;
end;
$$;

grant execute on function public.admin_update_task_effort(uuid, int) to authenticated;
