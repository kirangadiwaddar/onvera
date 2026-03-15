alter table public.projects
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.teams
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_projects_created_by on public.projects (created_by);
create index if not exists idx_teams_created_by on public.teams (created_by);
