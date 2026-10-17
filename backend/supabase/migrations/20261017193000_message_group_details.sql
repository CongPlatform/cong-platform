-- Group presentation; existing messages and users are preserved.
alter table public.message_conversations
  add column if not exists description varchar(500),
  add column if not exists avatar_path text;

-- Send metadata refresh events whenever the group photo or description changes.
drop trigger if exists cong_chat_conversation_updated on public.message_conversations;
create trigger cong_chat_conversation_updated
  after update of contact_status,title,description,avatar_path,updated_at
  on public.message_conversations
  for each row execute function public.cong_chat_notify_conversation_update();
