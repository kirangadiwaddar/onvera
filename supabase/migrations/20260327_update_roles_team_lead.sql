alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = case
  when role in ('agency', 'freelancer', 'admin') then 'team_lead'
  else role
end;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('team_lead', 'team_member', 'project_member'));

update public.profiles
set role = 'team_lead'
where role is null;
