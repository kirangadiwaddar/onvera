create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  project_id bigint references public.projects(id) on delete set null,
  project_slug text,
  type text not null default 'info',
  title text not null,
  message text,
  actor text,
  status text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (lower(recipient_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (lower(recipient_email) = lower(auth.jwt() ->> 'email'))
with check (lower(recipient_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using (lower(recipient_email) = lower(auth.jwt() ->> 'email'));

grant select, update, delete on public.notifications to authenticated;
revoke select on public.notifications from anon;

create index if not exists idx_notifications_recipient_email_created_at
  on public.notifications (recipient_email, created_at desc);
create index if not exists idx_notifications_recipient_email_unread
  on public.notifications (recipient_email, is_read)
  where dismissed_at is null;
create index if not exists idx_notifications_project_id
  on public.notifications (project_id);

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
