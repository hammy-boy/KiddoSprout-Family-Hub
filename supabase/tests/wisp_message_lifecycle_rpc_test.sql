-- Authorization tests for Wisp message soft deletion and read receipts.
begin;
set local search_path = public, extensions;
select no_plan();

select is(
  (
    select pg_proc.prosecdef
    from pg_proc
    where pg_proc.oid = 'public.wisp_delete_message(uuid)'::regprocedure
  ),
  false,
  'the public delete wrapper is SECURITY INVOKER'
);
select is(
  (
    select pg_proc.prosecdef
    from pg_proc
    where pg_proc.oid = 'public.wisp_mark_chat_read(uuid,uuid[])'::regprocedure
  ),
  false,
  'the public read-receipt wrapper is SECURITY INVOKER'
);
select is(
  (
    select pg_proc.prosecdef
    from pg_proc
    where pg_proc.oid = 'public.wisp_list_unread_counts()'::regprocedure
  ),
  false,
  'the unread-count query is SECURITY INVOKER'
);
select is(
  (
    select pg_proc.prosecdef
    from pg_proc
    where pg_proc.oid =
      'public.wisp_list_chat_summaries(timestamptz,uuid,integer)'::regprocedure
  ),
  false,
  'the paginated chat-summary query is SECURITY INVOKER'
);
select is(
  (
    select count(*)::integer
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'wisp_private'
      and pg_proc.proname in (
        'delete_message',
        'mark_chat_read',
        'can_view_message_receipt'
      )
      and pg_proc.prosecdef
  ),
  3,
  'all three privileged message helpers remain in wisp_private'
);

select ok(
  (
    select bool_and(
      exists (
        select 1
        from unnest(coalesce(pg_proc.proconfig, array[]::text[])) as setting
        where setting ~ '^search_path=(""|)$'
      )
    )
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where (
      pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'wisp_delete_message',
        'wisp_mark_chat_read',
        'wisp_list_unread_counts',
        'wisp_list_chat_summaries'
      )
    ) or (
      pg_namespace.nspname = 'wisp_private'
      and pg_proc.proname in (
        'delete_message',
        'mark_chat_read',
        'can_view_message_receipt'
      )
    )
  ),
  'every new public and private function fixes search_path to empty'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.wisp_delete_message(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute the delete RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.wisp_mark_chat_read(uuid,uuid[])',
    'EXECUTE'
  ),
  'anon cannot execute the read-receipt RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.wisp_delete_message(uuid)',
    'EXECUTE'
  ),
  'authenticated clients can execute the guarded delete RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.wisp_mark_chat_read(uuid,uuid[])',
    'EXECUTE'
  ),
  'authenticated clients can execute the guarded read-receipt RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.wisp_list_unread_counts()',
    'EXECUTE'
  ),
  'anon cannot execute the unread-count query'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.wisp_list_unread_counts()',
    'EXECUTE'
  ),
  'authenticated clients can execute the RLS-filtered unread-count query'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.wisp_list_chat_summaries(timestamptz,uuid,integer)',
    'EXECUTE'
  ),
  'anon cannot execute the chat-summary query'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.wisp_list_chat_summaries(timestamptz,uuid,integer)',
    'EXECUTE'
  ),
  'authenticated clients can execute the RLS-filtered chat-summary query'
);
select ok(
  not has_function_privilege(
    'anon',
    'wisp_private.delete_message(uuid)',
    'EXECUTE'
  ),
  'anon cannot bypass the public delete wrapper'
);
select ok(
  not has_function_privilege(
    'anon',
    'wisp_private.mark_chat_read(uuid,uuid[])',
    'EXECUTE'
  ),
  'anon cannot bypass the public receipt wrapper'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.wisp_messages',
    'UPDATE'
  ),
  'authenticated clients have no direct message UPDATE grant'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_message_receipts',
    'message_id',
    'INSERT'
  ),
  'authenticated clients cannot bypass the batch RPC with a direct receipt INSERT'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_messages',
    'deleted_at',
    'UPDATE'
  ),
  'authenticated clients cannot directly set deleted_at'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_message_receipts',
    'read_at',
    'INSERT'
  ),
  'authenticated clients cannot forge a receipt timestamp on INSERT'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_message_receipts',
    'read_at',
    'UPDATE'
  ),
  'authenticated clients cannot forge a receipt timestamp on UPDATE'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wisp_message_receipts'
      and policyname = 'wisp_message_receipts_select_member'
  ),
  0,
  'the former unconditional chat-member receipt policy is removed'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wisp_message_receipts'
      and policyname = 'wisp_message_receipts_select_visible'
      and qual like '%can_view_message_receipt%'
  ),
  'receipt visibility is delegated to the privacy-aware server helper'
);
select ok(
  pg_get_functiondef('wisp_private.mark_chat_read(uuid,uuid[])'::regprocedure)
    ~* 'limit[[:space:]]+200',
  'the chat-level receipt operation processes a bounded 200-message window'
);
select ok(
  pg_get_functiondef(
    'public.wisp_list_chat_summaries(timestamptz,uuid,integer)'::regprocedure
  ) ~* 'activity_at[[:space:]]*<[[:space:]]*p_before_activity_at'
  and pg_get_functiondef(
    'public.wisp_list_chat_summaries(timestamptz,uuid,integer)'::regprocedure
  ) ~* 'chat_id[[:space:]]*<[[:space:]]*p_before_chat_id'
  and pg_get_functiondef(
    'public.wisp_list_chat_summaries(timestamptz,uuid,integer)'::regprocedure
  ) ~* 'limit[^;]*\+[[:space:]]*1',
  'the chat summary RPC uses a stable tie-broken cursor and one look-ahead row'
);
select ok(
  pg_get_functiondef('wisp_private.mark_chat_read(uuid,uuid[])'::regprocedure)
    like '%wisp_private.can_interact_in_chat%',
  'blocked chats cannot generate new read receipts'
);
select ok(
  pg_get_functiondef(
    'wisp_private.can_view_message_receipt(uuid,uuid)'::regprocedure
  ) like '%wisp_private.can_view_profile%',
  'a sender cannot observe receipt activity from a blocked profile'
);
select ok(
  not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in ('wisp_messages', 'wisp_message_receipts')
  ),
  'private message and receipt rows are not exposed through Postgres Changes'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'wisp_chat_receive'
      and cmd = 'SELECT'
      and qual like '%can_receive_chat_topic%'
  ),
  'chat members can receive only membership-gated private refresh hints'
);
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and cmd = 'INSERT'
      and with_check ilike '%wisp-chat%'
  ),
  0,
  'browser clients cannot publish chat refresh hints'
);
select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.wisp_messages'::regclass
      and tgname = 'wisp_messages_broadcast_refresh'
      and not tgisinternal
  ),
  'message changes emit an opaque server-side refresh hint'
);

insert into auth.users (id, email, is_anonymous)
values
  ('71000000-0000-4000-8000-000000000001', 'wisp-alice@example.invalid', false),
  ('71000000-0000-4000-8000-000000000002', 'wisp-bob@example.invalid', false),
  ('71000000-0000-4000-8000-000000000003', 'wisp-charlie@example.invalid', false),
  ('71000000-0000-4000-8000-000000000004', null, true);

insert into public.wisp_profiles (id, username)
values
  ('71000000-0000-4000-8000-000000000001', 'LifecycleAlice'),
  ('71000000-0000-4000-8000-000000000002', 'LifecycleBob'),
  ('71000000-0000-4000-8000-000000000003', 'LifecycleCharlie');

insert into public.wisp_chats (
  id,
  created_by,
  direct_user_low,
  direct_user_high
)
values (
  '71000000-0000-4000-8000-000000000010',
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002'
);

insert into public.wisp_chat_members (chat_id, user_id, role)
values
  (
    '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000001',
    'admin'
  ),
  (
    '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000002',
    'member'
  );

insert into public.wisp_messages (id, chat_id, sender_id, content)
values
  (
    '71000000-0000-4000-8000-000000000020',
    '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000001',
    'Alice message'
  ),
  (
    '71000000-0000-4000-8000-000000000021',
    '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000002',
    'Bob message'
  );

insert into public.wisp_chats (
  id,
  created_by,
  direct_user_low,
  direct_user_high
)
values (
  '71000000-0000-4000-8000-000000000011',
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000003'
);

insert into public.wisp_chat_members (chat_id, user_id, role, joined_at)
values
  (
    '71000000-0000-4000-8000-000000000011',
    '71000000-0000-4000-8000-000000000001',
    'admin',
    '2020-01-01 00:00:00+00'
  ),
  (
    '71000000-0000-4000-8000-000000000011',
    '71000000-0000-4000-8000-000000000003',
    'member',
    '2020-01-01 00:00:00+00'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select count(*)::integer
    from public.wisp_list_chat_summaries(null, null, 1)
  ),
  2,
  'a one-row inbox page returns one look-ahead row when more chats exist'
);
select is(
  (
    with first_summary as (
      select summary.activity_at, summary.chat_id
      from public.wisp_list_chat_summaries(null, null, 1) as summary
      order by summary.activity_at desc, summary.chat_id desc
      limit 1
    )
    select paged.chat_id
    from first_summary
    cross join lateral public.wisp_list_chat_summaries(
      first_summary.activity_at,
      first_summary.chat_id,
      1
    ) as paged
    order by paged.activity_at desc, paged.chat_id desc
    limit 1
  ),
  '71000000-0000-4000-8000-000000000011'::uuid,
  'the activity/chat cursor reaches the next conversation without overlap'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":true}',
  true
);
select throws_ok(
  $$select public.wisp_delete_message(
      '71000000-0000-4000-8000-000000000020'
    )$$,
  '42501',
  'A permanent signed-in account is required.',
  'a Supabase anonymous user cannot soft-delete a message'
);
select throws_ok(
  $$select public.wisp_mark_chat_read(
      '71000000-0000-4000-8000-000000000010',
      array['71000000-0000-4000-8000-000000000020'::uuid]
    )$$,
  '42501',
  'A permanent signed-in account is required.',
  'a Supabase anonymous user cannot create a read receipt'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select public.wisp_delete_message(
      '71000000-0000-4000-8000-000000000020'
    )$$,
  '42501',
  'This message cannot be deleted by the current account.',
  'a nonmember cannot delete a message in another chat'
);
select throws_ok(
  $$select public.wisp_mark_chat_read(
      '71000000-0000-4000-8000-000000000010',
      array['71000000-0000-4000-8000-000000000020'::uuid]
    )$$,
  '42501',
  'This chat cannot be marked read by the current account.',
  'a nonmember cannot mark another chat read'
);
select is(
  (select count(*)::integer from public.wisp_message_receipts),
  0,
  'a nonmember cannot see another chat receipt'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$update public.wisp_messages
    set deleted_at = statement_timestamp()
    where id = '71000000-0000-4000-8000-000000000021'$$,
  '42501',
  'permission denied for table wisp_messages',
  'a sender cannot bypass the delete RPC with a direct UPDATE'
);
select is(
  coalesce((
    select unread_count
    from public.wisp_list_unread_counts()
    where chat_id = '71000000-0000-4000-8000-000000000010'
  ), 0::bigint),
  1::bigint,
  'Bob sees exactly one unread message from Alice before marking the chat read'
);
select throws_ok(
  $$insert into public.wisp_message_receipts (
      message_id,
      user_id
    ) values (
      '71000000-0000-4000-8000-000000000020',
      '71000000-0000-4000-8000-000000000002'
    )$$,
  '42501',
  'permission denied for table wisp_message_receipts',
  'a member cannot bypass the chat-level receipt RPC with a direct INSERT'
);
select is(
  public.wisp_mark_chat_read(
    '71000000-0000-4000-8000-000000000010',
    array['71000000-0000-4000-8000-000000000020'::uuid]
  ),
  1,
  'Bob marks Alice''s visible messages read in one bounded RPC'
);
select is(
  public.wisp_mark_chat_read(
    '71000000-0000-4000-8000-000000000010',
    array['71000000-0000-4000-8000-000000000020'::uuid]
  ),
  0,
  'repeating the chat-level receipt RPC is idempotent'
);
select is(
  coalesce((
    select unread_count
    from public.wisp_list_unread_counts()
    where chat_id = '71000000-0000-4000-8000-000000000010'
  ), 0::bigint),
  0::bigint,
  'Bob has no unread messages after marking the chat read'
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
      and user_id = '71000000-0000-4000-8000-000000000002'
      and delivered_at is not null
      and read_at is not null
      and read_at >= delivered_at
  ),
  1,
  'the RPC creates one valid server-timestamped receipt'
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000021'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  0,
  'the batch never creates a receipt for Bob''s own message'
);
select throws_ok(
  $$select public.wisp_delete_message(
      '71000000-0000-4000-8000-000000000020'
    )$$,
  '42501',
  'This message cannot be deleted by the current account.',
  'a chat member cannot delete another sender''s message'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  1,
  'the message sender sees an opted-in reader receipt'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
update public.wisp_profiles
set show_read_receipts = false
where id = '71000000-0000-4000-8000-000000000002';
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
  ),
  1,
  'a reader still sees their own receipt after opting out of sharing'
);

reset role;
insert into public.wisp_messages (id, chat_id, sender_id, content)
values (
  '71000000-0000-4000-8000-000000000022',
  '71000000-0000-4000-8000-000000000010',
  '71000000-0000-4000-8000-000000000001',
  'Alice message read while sharing is off'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  public.wisp_mark_chat_read(
    '71000000-0000-4000-8000-000000000010',
    array['71000000-0000-4000-8000-000000000022'::uuid]
  ),
  1,
  'a reader can privately mark a message read while receipt sharing is off'
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000022'
      and user_id = '71000000-0000-4000-8000-000000000002'
      and read_at is not null
      and shared_at is null
  ),
  1,
  'a private read stores no shareable timestamp'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  0,
  'the sender cannot see a reader receipt after that reader opts out'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
update public.wisp_profiles
set show_read_receipts = true
where id = '71000000-0000-4000-8000-000000000002';

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000022'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  0,
  'opting in later does not retroactively expose a private read'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
insert into public.wisp_blocks (owner_id, blocked_id)
values (
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000001'
);
select throws_ok(
  $$select public.wisp_mark_chat_read(
      '71000000-0000-4000-8000-000000000010',
      array['71000000-0000-4000-8000-000000000020'::uuid]
    )$$,
  '42501',
  'This chat cannot be marked read by the current account.',
  'a blocked chat cannot generate new read receipts'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  0,
  'a sender cannot observe an opted-in reader receipt while either profile has blocked the other'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
delete from public.wisp_blocks
where owner_id = '71000000-0000-4000-8000-000000000002'
  and blocked_id = '71000000-0000-4000-8000-000000000001';

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  1,
  'the sender sees the receipt again only after the reader opts in and the block is removed'
);
select is(
  public.wisp_mark_chat_read(
    '71000000-0000-4000-8000-000000000010',
    array['71000000-0000-4000-8000-000000000021'::uuid]
  ),
  1,
  'Alice marks Bob''s message read without marking her own message'
);
select ok(
  public.wisp_delete_message(
    '71000000-0000-4000-8000-000000000020'
  ),
  'Alice can soft-delete her own message through the RPC'
);
select is(
  (
    select count(*)::integer
    from public.wisp_messages
    where id = '71000000-0000-4000-8000-000000000020'
      and deleted_at is not null
      and content is null
      and media_url is null
      and media_type is null
      and reply_to_id is null
      and disappears_at is null
  ),
  1,
  'soft deletion keeps the row but scrubs its user-controlled payload'
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  0,
  'the sender cannot see receipt metadata after deleting the message'
);
select ok(
  public.wisp_delete_message(
    '71000000-0000-4000-8000-000000000020'
  ),
  'soft deletion is idempotent for the original sender'
);

reset role;
delete from public.wisp_message_receipts
where message_id = '71000000-0000-4000-8000-000000000020'
  and user_id = '71000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  public.wisp_mark_chat_read(
    '71000000-0000-4000-8000-000000000010',
    array['71000000-0000-4000-8000-000000000020'::uuid]
  ),
  0,
  'a deleted message cannot gain a new read receipt'
);
select is(
  (
    select count(*)::integer
    from public.wisp_message_receipts
    where message_id = '71000000-0000-4000-8000-000000000020'
      and user_id = '71000000-0000-4000-8000-000000000002'
  ),
  0,
  'the deleted message remains without a receipt after the batch call'
);

select * from finish();
rollback;
