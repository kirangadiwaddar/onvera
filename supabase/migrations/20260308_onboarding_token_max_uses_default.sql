alter table if exists public.onboarding_tokens
  alter column max_uses set default 1000;
