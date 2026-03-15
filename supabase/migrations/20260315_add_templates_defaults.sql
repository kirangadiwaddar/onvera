alter table if exists public.templates
  add column if not exists template_key text,
  add column if not exists is_default boolean default false;

create index if not exists templates_template_key_idx
  on public.templates (template_key);

create index if not exists templates_is_default_idx
  on public.templates (is_default);
