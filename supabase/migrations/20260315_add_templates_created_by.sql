alter table if exists public.templates
  add column if not exists created_by uuid;

create index if not exists templates_created_by_idx
  on public.templates (created_by);
