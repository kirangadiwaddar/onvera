alter table public.templates
  add column if not exists structure jsonb not null default '[]'::jsonb;
