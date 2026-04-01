-- Performance indexes for dashboard/workspace/project access patterns.
-- These match current filters in API routes:
-- - projects.team_ids overlaps(...)
-- - projects.extra_members contains(...)
-- - onboarding_tokens filtered by project_slug with recent-first ordering

create index if not exists idx_projects_team_ids_gin
  on public.projects using gin (team_ids);

create index if not exists idx_projects_extra_members_gin
  on public.projects using gin (extra_members jsonb_path_ops);

create index if not exists idx_onboarding_tokens_project_slug_created_at
  on public.onboarding_tokens (project_slug, created_at desc);

