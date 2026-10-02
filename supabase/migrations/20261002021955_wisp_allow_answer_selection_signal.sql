-- The multi-device call handshake emits `answer-selected` after the caller
-- accepts the first answer. Without this event in the private Broadcast
-- allowlist, Realtime rejects the selection and the otherwise healthy call is
-- torn down while losing devices can remain in an ambiguous local state.
drop policy if exists wisp_call_send on realtime.messages;
create policy wisp_call_send
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.event in (
      'offer',
      'answer',
      'answer-selected',
      'ice-candidate',
      'end'
    )
    and wisp_private.can_signal_topic((select realtime.topic()))
  );
