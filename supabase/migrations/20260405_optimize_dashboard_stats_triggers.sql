create index if not exists idx_projects_created_by_created_at_desc
  on public.projects (created_by, created_at desc);

create or replace function public.apply_dashboard_stats_delta(
  target_workspace_id uuid,
  total_delta integer,
  completed_delta integer,
  overdue_delta integer,
  active_delta integer,
  waiting_delta integer,
  ongoing_delta integer
)
returns void
language plpgsql
as $$
begin
  if target_workspace_id is null then
    return;
  end if;

  insert into public.dashboard_stats (
    workspace_id,
    total_projects,
    completed_projects,
    overdue_projects,
    active_projects,
    waiting_projects,
    ongoing_projects,
    updated_at
  )
  values (
    target_workspace_id,
    0,
    0,
    0,
    0,
    0,
    0,
    now()
  )
  on conflict (workspace_id) do nothing;

  update public.dashboard_stats
  set
    total_projects = greatest(total_projects + total_delta, 0),
    completed_projects = greatest(completed_projects + completed_delta, 0),
    overdue_projects = greatest(overdue_projects + overdue_delta, 0),
    active_projects = greatest(active_projects + active_delta, 0),
    waiting_projects = greatest(waiting_projects + waiting_delta, 0),
    ongoing_projects = greatest(ongoing_projects + ongoing_delta, 0),
    updated_at = now()
  where workspace_id = target_workspace_id;
end;
$$;

create or replace function public.projects_dashboard_after_write()
returns trigger
language plpgsql
as $$
declare
  old_active_delta integer := case when old.status in ('waiting', 'ongoing', 'onhold') then 1 else 0 end;
  new_active_delta integer := case when new.status in ('waiting', 'ongoing', 'onhold') then 1 else 0 end;
begin
  if tg_op = 'INSERT' then
    perform public.apply_dashboard_stats_delta(
      new.created_by,
      1,
      case when new.status = 'completed' then 1 else 0 end,
      case when new.status = 'overdue' then 1 else 0 end,
      new_active_delta,
      case when new.status = 'waiting' then 1 else 0 end,
      case when new.status = 'ongoing' then 1 else 0 end
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.apply_dashboard_stats_delta(
      old.created_by,
      -1,
      case when old.status = 'completed' then -1 else 0 end,
      case when old.status = 'overdue' then -1 else 0 end,
      -old_active_delta,
      case when old.status = 'waiting' then -1 else 0 end,
      case when old.status = 'ongoing' then -1 else 0 end
    );
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.created_by is distinct from new.created_by then
      perform public.apply_dashboard_stats_delta(
        old.created_by,
        -1,
        case when old.status = 'completed' then -1 else 0 end,
        case when old.status = 'overdue' then -1 else 0 end,
        -old_active_delta,
        case when old.status = 'waiting' then -1 else 0 end,
        case when old.status = 'ongoing' then -1 else 0 end
      );

      perform public.apply_dashboard_stats_delta(
        new.created_by,
        1,
        case when new.status = 'completed' then 1 else 0 end,
        case when new.status = 'overdue' then 1 else 0 end,
        new_active_delta,
        case when new.status = 'waiting' then 1 else 0 end,
        case when new.status = 'ongoing' then 1 else 0 end
      );

      return new;
    end if;

    if old.status is distinct from new.status then
      perform public.apply_dashboard_stats_delta(
        new.created_by,
        0,
        case
          when old.status = 'completed' then -1
          when new.status = 'completed' then 1
          else 0
        end,
        case
          when old.status = 'overdue' then -1
          when new.status = 'overdue' then 1
          else 0
        end,
        new_active_delta - old_active_delta,
        case
          when old.status = 'waiting' then -1
          when new.status = 'waiting' then 1
          else 0
        end,
        case
          when old.status = 'ongoing' then -1
          when new.status = 'ongoing' then 1
          else 0
        end
      );
    else
      update public.dashboard_stats
      set updated_at = now()
      where workspace_id = new.created_by;
    end if;

    return new;
  end if;

  return null;
end;
$$;
