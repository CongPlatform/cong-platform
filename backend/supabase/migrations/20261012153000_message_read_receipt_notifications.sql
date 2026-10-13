begin;

create or replace function public.notify_message_receipt_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare user_auth_id uuid;
begin
  if new.last_read_at is distinct from old.last_read_at and new.last_read_at > old.last_read_at then
    for user_auth_id in
      select u.auth_user_id
        from public.message_conversation_participants p
        join public.users u on u.id = p.user_id
       where p.conversation_id = new.conversation_id
         and u.active = true
    loop
      perform realtime.send(
        jsonb_build_object('conversationId', new.conversation_id, 'receiptUserId', new.user_id),
        'message_changed',
        'cong:message-user:' || user_auth_id::text,
        true
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists cong_message_receipt_changed on public.message_conversation_participants;
create trigger cong_message_receipt_changed
  after update of last_read_at on public.message_conversation_participants
  for each row
  when (new.last_read_at is distinct from old.last_read_at)
  execute function public.notify_message_receipt_changed();

commit;
