-- Normalize template_key for existing rows
update public.templates
set template_key = id
where (template_key is null or template_key = '')
  and is_default is true;

update public.templates
set template_key = regexp_replace(
  regexp_replace(lower(trim(title)), '[^a-z0-9]+', '-', 'g'),
  '(^-+|-+$)',
  '',
  'g'
)
where (template_key is null or template_key = '');

-- Ensure user-owned templates are never marked default
update public.templates
set is_default = false
where created_by is not null
  and (is_default is null or is_default = true);

-- Enforce default ownership rules for new rows
alter table public.templates
  add constraint templates_default_requires_null_owner
  check (is_default is not true or created_by is null)
  not valid;

-- Prevent duplicate defaults and duplicate user templates
create unique index if not exists templates_default_template_key_unique
  on public.templates (template_key)
  where is_default is true and template_key is not null;

create unique index if not exists templates_user_template_key_unique
  on public.templates (created_by, template_key)
  where created_by is not null and template_key is not null;
