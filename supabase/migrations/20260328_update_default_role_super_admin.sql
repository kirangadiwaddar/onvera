create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'super_admin'),
    coalesce(new.raw_user_meta_data ->> 'plan', 'free')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        plan = excluded.plan,
        updated_at = now();

  return new;
end;
$$;
