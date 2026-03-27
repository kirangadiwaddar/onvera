create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id bigint not null references public.projects(id) on delete cascade,
  project_slug text not null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_avatar text,
  author_email text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_note_reactions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.project_notes(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (note_id, user_id, emoji)
);

create table if not exists public.project_note_mentions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.project_notes(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  mentioned_email text not null,
  created_at timestamptz not null default now()
);

alter table public.project_notes enable row level security;
alter table public.project_note_reactions enable row level security;
alter table public.project_note_mentions enable row level security;

drop policy if exists "Project members can read notes" on public.project_notes;
create policy "Project members can read notes"
on public.project_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_notes.project_id
      and (
        projects.created_by = auth.uid()
        or exists (
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
      )
  )
);

drop policy if exists "Project members can add notes" on public.project_notes;
create policy "Project members can add notes"
on public.project_notes
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from public.projects
    where projects.id = project_notes.project_id
      and (
        projects.created_by = auth.uid()
        or exists (
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
      )
  )
);

drop policy if exists "Project members can read note reactions" on public.project_note_reactions;
create policy "Project members can read note reactions"
on public.project_note_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_note_reactions.project_id
      and (
        projects.created_by = auth.uid()
        or exists (
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
      )
  )
);

drop policy if exists "Project members can add reactions" on public.project_note_reactions;
create policy "Project members can add reactions"
on public.project_note_reactions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where projects.id = project_note_reactions.project_id
      and (
        projects.created_by = auth.uid()
        or exists (
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
      )
  )
);

drop policy if exists "Project members can remove reactions" on public.project_note_reactions;
create policy "Project members can remove reactions"
on public.project_note_reactions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their note mentions" on public.project_note_mentions;
create policy "Users can read their note mentions"
on public.project_note_mentions
for select
to authenticated
using (lower(mentioned_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Project members can add note mentions" on public.project_note_mentions;
create policy "Project members can add note mentions"
on public.project_note_mentions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_note_mentions.project_id
      and (
        projects.created_by = auth.uid()
        or exists (
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
      )
  )
);

grant select, insert on public.project_notes to authenticated;
grant select, insert, delete on public.project_note_reactions to authenticated;
grant select, insert on public.project_note_mentions to authenticated;
revoke select on public.project_notes from anon;
revoke select on public.project_note_reactions from anon;
revoke select on public.project_note_mentions from anon;

create index if not exists idx_project_notes_project_id on public.project_notes (project_id);
create index if not exists idx_project_notes_created_at on public.project_notes (created_at desc);
create index if not exists idx_project_note_reactions_note_id on public.project_note_reactions (note_id);
create index if not exists idx_project_note_reactions_project_id on public.project_note_reactions (project_id);
create index if not exists idx_project_note_mentions_note_id on public.project_note_mentions (note_id);
create index if not exists idx_project_note_mentions_project_id on public.project_note_mentions (project_id);
create index if not exists idx_project_note_mentions_email on public.project_note_mentions (mentioned_email);
