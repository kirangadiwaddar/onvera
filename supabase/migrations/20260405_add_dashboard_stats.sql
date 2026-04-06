alter table if exists public.projects
  add column if not exists last_client_update_at timestamptz;

create table if not exists public.dashboard_stats (
  workspace_id uuid primary key references auth.users(id) on delete cascade,
  total_projects integer not null default 0,
  completed_projects integer not null default 0,
  overdue_projects integer not null default 0,
  active_projects integer not null default 0,
  waiting_projects integer not null default 0,
  ongoing_projects integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_created_by_status_created_at
  on public.projects (created_by, status, created_at);

create index if not exists idx_projects_created_by_last_client_update_at
  on public.projects (created_by, last_client_update_at desc)
  where last_client_update_at is not null;

create index if not exists idx_dashboard_stats_workspace_id
  on public.dashboard_stats (workspace_id);

update public.projects
set last_client_update_at = nullif(submissions ->> '__last_client_update', '')::timestamptz
where submissions ? '__last_client_update';

create or replace function public.refresh_dashboard_stats_for_workspace(target_workspace_id uuid)
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
  select
    target_workspace_id,
    count(*)::integer as total_projects,
    count(*) filter (where status = 'completed')::integer as completed_projects,
    count(*) filter (where status = 'overdue')::integer as overdue_projects,
    count(*) filter (where status in ('waiting', 'ongoing', 'onhold'))::integer as active_projects,
    count(*) filter (where status = 'waiting')::integer as waiting_projects,
    count(*) filter (where status = 'ongoing')::integer as ongoing_projects,
    now()
  from public.projects
  where created_by = target_workspace_id
  on conflict (workspace_id) do update
  set
    total_projects = excluded.total_projects,
    completed_projects = excluded.completed_projects,
    overdue_projects = excluded.overdue_projects,
    active_projects = excluded.active_projects,
    waiting_projects = excluded.waiting_projects,
    ongoing_projects = excluded.ongoing_projects,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.projects_dashboard_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.submissions ? '__last_client_update' then
    new.last_client_update_at := nullif(new.submissions ->> '__last_client_update', '')::timestamptz;
  elsif tg_op = 'INSERT' then
    new.last_client_update_at := null;
  end if;

  return new;
end;
$$;

create or replace function public.projects_dashboard_after_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_dashboard_stats_for_workspace(new.created_by);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.created_by is distinct from new.created_by then
      perform public.refresh_dashboard_stats_for_workspace(old.created_by);
    end if;
    perform public.refresh_dashboard_stats_for_workspace(new.created_by);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_dashboard_stats_for_workspace(old.created_by);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists projects_dashboard_before_write on public.projects;
create trigger projects_dashboard_before_write
before insert or update of submissions
on public.projects
for each row
execute function public.projects_dashboard_before_write();

drop trigger if exists projects_dashboard_after_write on public.projects;
create trigger projects_dashboard_after_write
after insert or update of status, created_by, submissions or delete
on public.projects
for each row
execute function public.projects_dashboard_after_write();

insert into public.dashboard_stats (workspace_id)
select distinct created_by
from public.projects
where created_by is not null
on conflict (workspace_id) do nothing;

do $$
declare
  workspace_row record;
begin
  for workspace_row in
    select distinct created_by as workspace_id
    from public.projects
    where created_by is not null
  loop
    perform public.refresh_dashboard_stats_for_workspace(workspace_row.workspace_id);
  end loop;
end $$;
