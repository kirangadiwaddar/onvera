alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

create index if not exists profiles_stripe_subscription_idx
  on public.profiles (stripe_subscription_id);
