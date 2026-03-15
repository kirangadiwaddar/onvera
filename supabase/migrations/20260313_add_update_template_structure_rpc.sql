create or replace function public.update_template_structure(
  next_structure jsonb,
  template_id text
)
returns void
language sql
security definer
as $$
  update public.templates
  set structure = next_structure
  where id = template_id;
$$;
