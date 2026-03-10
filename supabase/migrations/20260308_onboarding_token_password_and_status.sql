alter table if exists public.onboarding_tokens
  add column if not exists password_hash text,
  add column if not exists password_plain text;
