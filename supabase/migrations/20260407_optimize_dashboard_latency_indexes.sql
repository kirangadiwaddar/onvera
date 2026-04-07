-- Dashboard and notifications latency indexes.
-- Keep response contracts unchanged; improve lookup and sort performance only.

create index if not exists idx_notifications_user_id_active_created_at_covering
  on public.notifications (user_id, created_at desc)
  include (title, project_slug, status, actor, is_read)
  where dismissed_at is null;

create index if not exists idx_notifications_user_id_unread_active_covering
  on public.notifications (user_id, created_at desc)
  where dismissed_at is null and is_read = false;

create index if not exists idx_projects_dashboard_attention_covering
  on public.projects (created_by, status, created_at)
  include (slug, title, avatar_src, template_id)
  where status in ('overdue', 'waiting');

create index if not exists idx_projects_dashboard_created_covering
  on public.projects (created_by, created_at desc)
  include (slug, title, status);

create index if not exists idx_projects_dashboard_last_client_update_covering
  on public.projects (created_by, last_client_update_at desc)
  include (slug, title)
  where last_client_update_at is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_members'
      and column_name = 'user_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_members'
      and column_name = 'workspace_id'
  ) then
    execute 'create index if not exists idx_team_members_user_id_workspace_id on public.team_members (user_id, workspace_id)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'user_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'workspace_id'
  ) then
    execute 'create index if not exists idx_workspace_members_user_id_workspace_id on public.workspace_members (user_id, workspace_id)';
  end if;
end $$;
