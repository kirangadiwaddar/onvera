-- Remove template dependency from teams
alter table if exists public.teams
  drop column if exists template_id;
