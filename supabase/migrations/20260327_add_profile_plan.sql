alter table public.profiles
  add column if not exists plan text;

alter table public.profiles
  drop constraint if exists profiles_plan_check;

update public.profiles
set plan = 'free'
where plan is null;

alter table public.profiles
  alter column plan set default 'free';

alter table public.profiles
  alter column plan set not null;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'freelancer', 'agency', 'agency_pro'));
