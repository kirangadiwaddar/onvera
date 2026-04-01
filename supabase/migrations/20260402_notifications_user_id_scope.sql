alter table if exists public.notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill user ownership for existing rows created before user_id scoping.
update public.notifications as n
set user_id = u.id
from auth.users as u
where n.user_id is null
  and n.recipient_email is not null
  and lower(u.email) = lower(n.recipient_email);

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_notifications_user_id_created_at
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_id_unread
  on public.notifications (user_id, is_read)
  where dismissed_at is null;
