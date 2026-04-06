create index if not exists idx_notifications_user_id_active_created_at
  on public.notifications (user_id, created_at desc)
  where dismissed_at is null;

create index if not exists idx_notifications_user_id_unread_active
  on public.notifications (user_id)
  where dismissed_at is null and is_read = false;
