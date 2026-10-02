-- Add guarded Wisp message lifecycle operations without granting browser
-- clients direct UPDATE/DELETE access to message or receipt rows.

-- Chat refresh channels are receive-only for browsers. The separate call
-- helper and policies stay call-only so chat membership never grants a client
-- permission to publish refresh events.
create or replace function wisp_private.can_signal_topic(
  p_topic text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  chat_id uuid;
begin
  if auth.uid() is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_topic is null
     or p_topic !~* '^wisp-call:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  chat_id := substr(p_topic, 11)::uuid;
  return wisp_private.can_interact_in_chat(chat_id);
end
$function$;

create or replace function wisp_private.can_receive_chat_topic(
  p_topic text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  chat_id uuid;
begin
  if auth.uid() is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_topic is null
     or p_topic !~* '^wisp-chat:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  chat_id := substr(p_topic, 11)::uuid;
  return wisp_private.can_interact_in_chat(chat_id);
end
$function$;

revoke all on function wisp_private.can_receive_chat_topic(text)
  from public, anon, authenticated, service_role;
grant execute on function wisp_private.can_receive_chat_topic(text)
  to authenticated;

create or replace function wisp_private.broadcast_message_refresh()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  target_chat_id uuid;
begin
  target_chat_id := case when tg_op = 'DELETE' then old.chat_id else new.chat_id end;
  perform realtime.send(
    '{}'::jsonb,
    'refresh',
    'wisp-chat:' || target_chat_id::text,
    true
  );
  if tg_op = 'UPDATE' and old.chat_id is distinct from new.chat_id then
    perform realtime.send(
      '{}'::jsonb,
      'refresh',
      'wisp-chat:' || old.chat_id::text,
      true
    );
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$function$;

revoke all on function wisp_private.broadcast_message_refresh()
  from public, anon, authenticated, service_role;

drop trigger if exists wisp_messages_broadcast_refresh
  on public.wisp_messages;
create trigger wisp_messages_broadcast_refresh
after insert or update or delete on public.wisp_messages
for each row execute function wisp_private.broadcast_message_refresh();

-- If a preview of this migration was applied before the visible-ID contract
-- was introduced, remove the obsolete overload before creating the guarded
-- two-argument version below.
drop function if exists public.wisp_mark_chat_read(uuid);
drop function if exists wisp_private.mark_chat_read(uuid);

alter table public.wisp_message_receipts
  add column if not exists shared_at timestamptz;

create or replace function wisp_private.delete_message(
  p_message_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;

  -- Lock the row and authorize against its immutable sender. Keeping the same
  -- error for missing and non-owned rows avoids exposing message existence.
  perform 1
  from public.wisp_messages as message
  where message.id = p_message_id
    and message.sender_id = actor_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'This message cannot be deleted by the current account.';
  end if;

  update public.wisp_messages as message
  set
    content = null,
    media_url = null,
    media_type = null,
    reply_to_id = null,
    disappears_at = null,
    deleted_at = coalesce(message.deleted_at, statement_timestamp())
  where message.id = p_message_id
    and message.sender_id = actor_id;

  return true;
end
$function$;

create or replace function wisp_private.mark_chat_read(
  p_chat_id uuid,
  p_message_ids uuid[]
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  marked_at timestamptz := statement_timestamp();
  marked_count integer;
  share_receipts boolean;
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;

  if p_chat_id is null
     or not wisp_private.can_interact_in_chat(p_chat_id) then
    raise exception using
      errcode = '42501',
      message = 'This chat cannot be marked read by the current account.';
  end if;

  if p_message_ids is null or cardinality(p_message_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_message_ids) > 200 then
    raise exception using
      errcode = '22023',
      message = 'At most 200 visible messages can be marked read at once.';
  end if;

  select profile.show_read_receipts
  into share_receipts
  from public.wisp_profiles as profile
  where profile.id = actor_id;

  -- Mark only IDs in the window the browser actually rendered. This prevents
  -- an open chat from silently marking older, unseen history as read.
  with visible_messages as materialized (
    select message.id
    from public.wisp_messages as message
    where message.chat_id = p_chat_id
      and message.id = any(p_message_ids)
      and message.sender_id <> actor_id
      and message.deleted_at is null
      and (
        message.disappears_at is null
        or message.disappears_at > marked_at
      )
      and not exists (
        select 1
        from public.wisp_message_receipts as existing_receipt
        where existing_receipt.message_id = message.id
          and existing_receipt.user_id = actor_id
          and existing_receipt.read_at is not null
      )
    order by message.created_at desc, message.id desc
    limit 200
  ), upserted_receipts as (
    insert into public.wisp_message_receipts as receipt (
      message_id,
      user_id,
      delivered_at,
      read_at,
      shared_at
    )
    select
      visible_message.id,
      actor_id,
      marked_at,
      marked_at,
      case when share_receipts then marked_at else null end
    from visible_messages as visible_message
    on conflict (message_id, user_id) do update
    set
      delivered_at = coalesce(receipt.delivered_at, excluded.delivered_at),
      read_at = coalesce(receipt.read_at, excluded.read_at),
      shared_at = coalesce(receipt.shared_at, excluded.shared_at)
    where receipt.delivered_at is null
       or receipt.read_at is null
    returning 1
  )
  select count(*)::integer
  into marked_count
  from upserted_receipts;

  if marked_count > 0 and share_receipts is true then
    perform realtime.send(
      '{}'::jsonb,
      'refresh',
      'wisp-chat:' || p_chat_id::text,
      true
    );
  end if;

  return marked_count;
end
$function$;

create or replace function wisp_private.can_view_message_receipt(
  p_message_id uuid,
  p_receipt_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_message_id is null
     or p_receipt_user_id is null then
    return false;
  end if;

  -- Readers always retain access to their own receipt. Only the original
  -- message sender may see somebody else's receipt, and only while that reader
  -- has opted in to sharing read receipts.
  if actor_id = p_receipt_user_id then
    return true;
  end if;

  return wisp_private.can_view_profile(p_receipt_user_id)
  and exists (
    select 1
    from public.wisp_messages as message
    join public.wisp_chat_members as reader_membership
      on reader_membership.chat_id = message.chat_id
     and reader_membership.user_id = p_receipt_user_id
    join public.wisp_profiles as reader_profile
      on reader_profile.id = reader_membership.user_id
    where message.id = p_message_id
      and message.sender_id = actor_id
      and message.deleted_at is null
      and (
        message.disappears_at is null
        or message.disappears_at > statement_timestamp()
      )
      and reader_profile.show_read_receipts = true
      and exists (
        select 1
        from public.wisp_message_receipts as shared_receipt
        where shared_receipt.message_id = p_message_id
          and shared_receipt.user_id = p_receipt_user_id
          and shared_receipt.shared_at is not null
      )
  );
end
$function$;

revoke all on function wisp_private.delete_message(uuid)
  from public, anon, authenticated;
revoke all on function wisp_private.mark_chat_read(uuid, uuid[])
  from public, anon, authenticated;
revoke all on function wisp_private.can_view_message_receipt(uuid, uuid)
  from public, anon, authenticated;

grant execute on function wisp_private.delete_message(uuid)
  to authenticated, service_role;
grant execute on function wisp_private.mark_chat_read(uuid, uuid[])
  to authenticated, service_role;
grant execute on function wisp_private.can_view_message_receipt(uuid, uuid)
  to authenticated, service_role;

drop policy if exists wisp_message_receipts_select_member
  on public.wisp_message_receipts;
drop policy if exists wisp_message_receipts_insert_own
  on public.wisp_message_receipts;
drop policy if exists wisp_message_receipts_update_own
  on public.wisp_message_receipts;
drop policy if exists wisp_message_receipts_select_visible
  on public.wisp_message_receipts;
create policy wisp_message_receipts_select_visible
  on public.wisp_message_receipts
  for select
  to authenticated
  using (
    wisp_private.can_view_message_receipt(
      wisp_message_receipts.message_id,
      wisp_message_receipts.user_id
    )
  );

create or replace function public.wisp_delete_message(
  p_message_id uuid
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select wisp_private.delete_message(p_message_id);
$function$;

create or replace function public.wisp_mark_chat_read(
  p_chat_id uuid,
  p_message_ids uuid[]
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $function$
  select wisp_private.mark_chat_read(p_chat_id, p_message_ids);
$function$;

-- Return exact unread totals without downloading every message to the browser.
-- SECURITY INVOKER keeps all membership, message, and receipt RLS policies in
-- force; a caller sees only their own chats and their own receipt rows.
create or replace function public.wisp_list_unread_counts()
returns table (
  chat_id uuid,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    message.chat_id,
    count(*)::bigint as unread_count
  from public.wisp_messages as message
  join public.wisp_chat_members as own_membership
    on own_membership.chat_id = message.chat_id
   and own_membership.user_id = (select auth.uid())
  left join public.wisp_message_receipts as own_receipt
    on own_receipt.message_id = message.id
   and own_receipt.user_id = (select auth.uid())
  where wisp_private.is_permanent_actor()
    and wisp_private.can_interact_in_chat(message.chat_id)
    and message.sender_id <> (select auth.uid())
    and message.deleted_at is null
    and (
      message.disappears_at is null
      or message.disappears_at > statement_timestamp()
    )
    and own_receipt.read_at is null
  group by message.chat_id;
$function$;

-- Fetch a stable, bounded inbox page. The lateral latest-message lookup keeps
-- a busy chat from consuming a global message limit, while the activity/chat
-- cursor makes every conversation reachable instead of silently stopping at
-- the first 100. One look-ahead row is returned so the client can expose an
-- honest "Load more" control without an extra count query.
drop function if exists public.wisp_list_chat_summaries();
create or replace function public.wisp_list_chat_summaries(
  p_before_activity_at timestamptz default null,
  p_before_chat_id uuid default null,
  p_limit integer default 50
)
returns table (
  chat_id uuid,
  latest_message_id uuid,
  latest_content text,
  latest_created_at timestamptz,
  latest_sender_id uuid,
  unread_count bigint,
  activity_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with inbox_rows as materialized (
    select
      own_membership.chat_id,
      latest.id as latest_message_id,
      latest.content as latest_content,
      latest.created_at as latest_created_at,
      latest.sender_id as latest_sender_id,
      coalesce(latest.created_at, own_membership.joined_at) as activity_at
    from public.wisp_chat_members as own_membership
    left join lateral (
      select message.id, message.content, message.created_at, message.sender_id
      from public.wisp_messages as message
      where message.chat_id = own_membership.chat_id
        and message.deleted_at is null
        and (
          message.disappears_at is null
          or message.disappears_at > statement_timestamp()
        )
      order by message.created_at desc, message.id desc
      limit 1
    ) as latest on true
    where own_membership.user_id = (select auth.uid())
      and wisp_private.is_permanent_actor()
      and wisp_private.can_interact_in_chat(own_membership.chat_id)
  ), inbox_page as materialized (
    select inbox_row.*
    from inbox_rows as inbox_row
    where (
      p_before_activity_at is null
      and p_before_chat_id is null
    ) or (
      inbox_row.activity_at < p_before_activity_at
      or (
        inbox_row.activity_at = p_before_activity_at
        and inbox_row.chat_id < p_before_chat_id
      )
    )
    order by inbox_row.activity_at desc, inbox_row.chat_id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100) + 1
  )
  select
    inbox_page.chat_id,
    inbox_page.latest_message_id,
    inbox_page.latest_content,
    inbox_page.latest_created_at,
    inbox_page.latest_sender_id,
    coalesce(unread.unread_count, 0)::bigint as unread_count,
    inbox_page.activity_at
  from inbox_page
  left join lateral (
    select count(*)::bigint as unread_count
    from public.wisp_messages as message
    left join public.wisp_message_receipts as own_receipt
      on own_receipt.message_id = message.id
     and own_receipt.user_id = (select auth.uid())
    where message.chat_id = inbox_page.chat_id
      and message.sender_id <> (select auth.uid())
      and message.deleted_at is null
      and (
        message.disappears_at is null
        or message.disappears_at > statement_timestamp()
      )
      and own_receipt.read_at is null
  ) as unread on true
  order by inbox_page.activity_at desc, inbox_page.chat_id desc;
$function$;

revoke all on function public.wisp_delete_message(uuid)
  from public, anon, authenticated;
revoke all on function public.wisp_mark_chat_read(uuid, uuid[])
  from public, anon, authenticated;
revoke all on function public.wisp_list_unread_counts()
  from public, anon, authenticated;
revoke all on function public.wisp_list_chat_summaries(timestamptz, uuid, integer)
  from public, anon, authenticated;

grant execute on function public.wisp_delete_message(uuid)
  to authenticated;
grant execute on function public.wisp_mark_chat_read(uuid, uuid[])
  to authenticated;
grant execute on function public.wisp_list_unread_counts()
  to authenticated;
grant execute on function public.wisp_list_chat_summaries(timestamptz, uuid, integer)
  to authenticated;

-- Preserve the RPC-only mutation boundary even if an earlier environment had
-- broader table or column grants than the canonical Wisp migration.
revoke update, delete on table public.wisp_messages
  from public, anon, authenticated;
revoke update (
  id,
  chat_id,
  sender_id,
  content,
  media_url,
  media_type,
  reply_to_id,
  edited_at,
  deleted_at,
  disappears_at,
  created_at
) on table public.wisp_messages from public, anon, authenticated;

revoke insert, update, delete on table public.wisp_message_receipts
  from public, anon, authenticated;
revoke insert (
  message_id,
  user_id,
  delivered_at,
  read_at,
  shared_at
) on table public.wisp_message_receipts from public, anon, authenticated;
revoke update (
  message_id,
  user_id,
  delivered_at,
  read_at,
  shared_at
) on table public.wisp_message_receipts from public, anon, authenticated;

-- Postgres Changes DELETE payloads are not RLS-filtered. Keep both messaging
-- tables out of the publication, including on databases where an earlier Wisp
-- migration was already applied. Wisp uses membership-gated private Broadcast
-- hints plus RLS-backed reads instead.
do $block$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
      and puballtables
  ) then
    raise exception using
      errcode = '55000',
      message = 'supabase_realtime publishes every table; change it to an explicit table list before installing private Wisp messaging.';
  end if;

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wisp_messages'
  ) then
    alter publication supabase_realtime
      drop table public.wisp_messages;
  end if;

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wisp_message_receipts'
  ) then
    alter publication supabase_realtime
      drop table public.wisp_message_receipts;
  end if;
end
$block$;

drop policy if exists wisp_chat_receive on realtime.messages;
create policy wisp_chat_receive
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and wisp_private.can_receive_chat_topic((select realtime.topic()))
  );

drop policy if exists wisp_call_receive on realtime.messages;
create policy wisp_call_receive
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and wisp_private.can_signal_topic((select realtime.topic()))
  );

drop policy if exists wisp_call_send on realtime.messages;
create policy wisp_call_send
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.event in ('offer', 'answer', 'ice-candidate', 'end')
    and wisp_private.can_signal_topic((select realtime.topic()))
  );

comment on function public.wisp_delete_message(uuid) is
  'Soft-deletes and scrubs one message only when the caller is its sender.';
comment on function public.wisp_mark_chat_read(uuid, uuid[]) is
  'Marks up to 200 explicitly visible messages by other chat members read in one idempotent operation.';
comment on function public.wisp_list_unread_counts() is
  'Returns exact RLS-filtered unread message totals for the current permanent account.';
comment on function public.wisp_list_chat_summaries(timestamptz, uuid, integer) is
  'Returns a keyset-paginated, RLS-filtered inbox page with one latest-message preview and exact unread total per chat.';

notify pgrst, 'reload schema';
