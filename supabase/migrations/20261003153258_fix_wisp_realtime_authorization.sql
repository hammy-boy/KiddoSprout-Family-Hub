-- Supabase Realtime evaluates private-channel write access when a client joins.
-- Its synthetic realtime.messages row contains the channel topic and extension,
-- but not the later Broadcast event name. Filtering on `event` therefore makes
-- the policy evaluate to NULL and denies every Wisp call signal. Event handling
-- remains allowlisted in the browser; the database authorization boundary is
-- authenticated, unblocked membership of the exact private call topic.
drop policy if exists wisp_call_send on realtime.messages;
create policy wisp_call_send
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and wisp_private.can_signal_topic((select realtime.topic()))
  );
