create index if not exists idx_projects_created_by_updated_at_desc
  on public.projects (created_by, updated_at desc);
