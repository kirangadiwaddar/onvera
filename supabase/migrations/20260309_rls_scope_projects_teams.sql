-- Scope team/project reads to owners + members. Remove public read.

alter table public.teams enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Public read teams" on public.teams;
drop policy if exists "Public read projects" on public.projects;

drop policy if exists "Team owners can read" on public.teams;
create policy "Team owners can read"
on public.teams
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "Team members can read" on public.teams;
create policy "Team members can read"
on public.teams
for select
to authenticated
using (
  (lead ->> 'email') ilike (auth.jwt() ->> 'email')
  or exists (
    select 1
    from jsonb_array_elements(members) as member
    where (member ->> 'email') ilike (auth.jwt() ->> 'email')
  )
);

drop policy if exists "Project owners can read" on public.projects;
create policy "Project owners can read"
on public.projects
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "Project members can read" on public.projects;
create policy "Project members can read"
on public.projects
for select
to authenticated
using (
  exists (
    select 1
    from public.teams as team
    where team.id = any (projects.team_ids)
      and (
        (team.lead ->> 'email') ilike (auth.jwt() ->> 'email')
        or exists (
          select 1
          from jsonb_array_elements(team.members) as member
          where (member ->> 'email') ilike (auth.jwt() ->> 'email')
        )
      )
  )
  or exists (
    select 1
    from jsonb_array_elements(projects.extra_members) as member
    where (member ->> 'email') ilike (auth.jwt() ->> 'email')
  )
);

grant select on public.teams to authenticated;
grant select on public.projects to authenticated;
revoke select on public.teams from anon;
revoke select on public.projects from anon;
