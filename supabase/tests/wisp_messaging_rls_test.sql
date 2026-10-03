-- Security, isolation, and lifecycle tests for the namespaced Wisp app.
begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'wisp_profiles', 'Wisp profile table exists');
select has_table('public', 'wisp_contacts', 'Wisp contacts table exists');
select has_table('public', 'wisp_blocks', 'Wisp blocks table exists');
select has_table('public', 'wisp_chats', 'Wisp chats table exists');
select has_table('public', 'wisp_chat_members', 'Wisp chat members table exists');
select has_table('public', 'wisp_messages', 'Wisp messages table exists');
select has_table('public', 'wisp_message_receipts', 'Wisp receipts table exists');
select has_table('public', 'wisp_calls', 'Wisp calls table exists');
select has_table('public', 'wisp_call_participants', 'Wisp call participants table exists');

select is(
  (
    select count(*)::integer
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname like 'wisp_%'
      and pg_class.relkind = 'r'
      and pg_class.relrowsecurity
  ),
  9,
  'RLS is enabled on all nine Wisp tables'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wisp_profiles'
      and column_name in (
        'email', 'phone', 'phone_number', 'address', 'full_name'
      )
  ),
  0,
  'Wisp profiles do not duplicate account PII'
);

select is(
  (
    select count(*)::integer
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname like 'wisp_%'
      and pg_proc.prosecdef
  ),
  0,
  'no public Wisp RPC is SECURITY DEFINER'
);

select is(
  (
    select count(*)::integer
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'wisp_private'
      and pg_proc.proname in (
        'can_view_profile',
        'is_chat_member',
        'can_interact_in_chat',
        'can_signal_topic',
        'enroll_profile',
        'get_or_create_direct_chat',
        'start_call',
        'join_call',
        'end_call'
      )
      and pg_proc.prosecdef
  ),
  9,
  'all nine RLS-bypassing implementations stay in wisp_private'
);

select is(
  (
    select count(*)::integer
    from pg_trigger
    join pg_class on pg_class.oid = pg_trigger.tgrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    join pg_proc on pg_proc.oid = pg_trigger.tgfoid
    join pg_namespace as function_namespace
      on function_namespace.oid = pg_proc.pronamespace
    where not pg_trigger.tgisinternal
      and pg_namespace.nspname = 'auth'
      and pg_class.relname = 'users'
      and (
        function_namespace.nspname = 'wisp_private'
        or pg_proc.proname like 'wisp_%'
      )
  ),
  0,
  'Wisp does not install a global auth.users trigger'
);

select ok(
  not has_schema_privilege('anon', 'wisp_private', 'USAGE'),
  'anon cannot use the private schema'
);
select ok(
  has_schema_privilege('authenticated', 'wisp_private', 'USAGE'),
  'authenticated sessions can invoke only explicitly granted private helpers'
);

select ok(
  not has_table_privilege('anon', 'public.wisp_profiles', 'SELECT'),
  'anon has no profile table grant'
);
select ok(
  not has_table_privilege('anon', 'public.wisp_messages', 'SELECT'),
  'anon has no message table grant'
);
select ok(
  not has_table_privilege('anon', 'public.wisp_messages', 'INSERT'),
  'anon has no message insert grant'
);
select ok(
  has_table_privilege('authenticated', 'public.wisp_messages', 'SELECT'),
  'authenticated clients receive the explicit message read grant'
);
select ok(
  has_column_privilege(
    'authenticated',
    'public.wisp_messages',
    'content',
    'INSERT'
  ),
  'authenticated clients can insert the message content used by the UI'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_messages',
    'created_at',
    'INSERT'
  ),
  'clients cannot forge message creation timestamps'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_messages',
    'media_url',
    'INSERT'
  ),
  'unfinished media uploads are not writable through the browser API'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_messages',
    'deleted_at',
    'INSERT'
  ),
  'clients cannot insert messages already marked deleted'
);
select ok(
  has_column_privilege(
    'authenticated',
    'public.wisp_contacts',
    'contact_id',
    'INSERT'
  ),
  'clients can insert the contact identifier used by the UI'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_contacts',
    'created_at',
    'INSERT'
  ),
  'clients cannot forge contact creation timestamps'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_blocks',
    'created_at',
    'INSERT'
  ),
  'clients cannot forge block creation timestamps'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.wisp_message_receipts',
    'delivered_at',
    'INSERT'
  ),
  'the unfinished receipt UI cannot forge delivery timestamps'
);
select ok(
  not has_table_privilege('authenticated', 'public.wisp_chats', 'INSERT'),
  'clients cannot bypass atomic direct-chat creation'
);
select ok(
  not has_table_privilege('authenticated', 'public.wisp_calls', 'INSERT'),
  'clients cannot bypass guarded call creation'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.wisp_enroll_profile(text)',
    'EXECUTE'
  ),
  'anon cannot call profile enrollment'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.wisp_enroll_profile(text)',
    'EXECUTE'
  ),
  'authenticated clients can call profile enrollment'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.wisp_get_or_create_direct_chat(uuid)',
    'EXECUTE'
  ),
  'authenticated clients can call atomic direct-chat creation'
);

select ok(
  not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wisp_messages'
  ),
  'private Wisp messages stay out of the Supabase Realtime publication'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname in ('wisp_call_receive', 'wisp_call_send')
  ),
  2,
  'private Wisp Broadcast has receive and send policies'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'wisp_call_receive'
      and qual like '%can_signal_topic%'
  ),
  'call reception is authorized by the chat-scoped topic helper'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'wisp_call_send'
      and with_check like '%extension%'
      and with_check like '%can_signal_topic%'
      and with_check not like '%event%'
  ),
  'call publishing authorizes the private topic without testing unavailable event metadata'
);

insert into auth.users (id, email, is_anonymous)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.invalid', false),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.invalid', false),
  ('33333333-3333-4333-8333-333333333333', 'charlie@example.invalid', false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, true);

create temp table wisp_test_runtime (
  name text primary key,
  value_uuid uuid
);
insert into wisp_test_runtime (name) values ('chat'), ('call'), ('message');
grant select, update on table wisp_test_runtime to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select throws_ok(
  $$select * from public.wisp_enroll_profile('Anonymous')$$,
  '42501',
  'A permanent signed-in account is required.',
  'anonymous Auth users cannot enroll a Wisp profile'
);
select is(
  (select count(*)::integer from public.wisp_profiles),
  0,
  'anonymous Auth users cannot read Wisp profiles'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select results_eq(
  $$select username from public.wisp_enroll_profile('Alice')$$,
  $$values ('Alice'::text)$$,
  'a permanent account can enroll a PII-free profile'
);
select throws_ok(
  $$select * from public.wisp_enroll_profile('../bad name')$$,
  '22023',
  'Username must be 3-32 letters, numbers, dots, dashes, or underscores.',
  'unsafe usernames are rejected'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',
  true
);
select results_eq(
  $$select username from public.wisp_enroll_profile('Bob')$$,
  $$values ('Bob'::text)$$,
  'a second permanent account can enroll'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select * from public.wisp_enroll_profile('alice')$$,
  '23505',
  'duplicate key value violates unique constraint "wisp_profiles_username_lower_key"',
  'usernames are unique without case tricks'
);
select results_eq(
  $$select username from public.wisp_enroll_profile('Charlie')$$,
  $$values ('Charlie'::text)$$,
  'the third account can choose an unused username'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$insert into public.wisp_chats (
      created_by, direct_user_low, direct_user_high
    ) values (
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    )$$,
  '42501',
  'permission denied for table wisp_chats',
  'direct table chat creation is denied'
);
select lives_ok(
  $$update wisp_test_runtime
    set value_uuid = public.wisp_get_or_create_direct_chat(
      '22222222-2222-4222-8222-222222222222'
    )
    where name = 'chat'$$,
  'Alice can atomically create a direct chat with Bob'
);
select is(
  (
    select count(*)::integer
    from public.wisp_chat_members
    where chat_id = (
      select value_uuid from wisp_test_runtime where name = 'chat'
    )
  ),
  2,
  'the direct chat contains exactly both members'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  public.wisp_get_or_create_direct_chat(
    '11111111-1111-4111-8111-111111111111'
  ),
  (select value_uuid from wisp_test_runtime where name = 'chat'),
  'the opposite direction reuses the same direct chat'
);

reset role;
select is(
  (select count(*)::integer from public.wisp_chats),
  1,
  'convergent direct-chat creation leaves one chat row'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select lives_ok(
  $$with inserted_message as (
      insert into public.wisp_messages (chat_id, sender_id, content)
      values (
        (select value_uuid from wisp_test_runtime where name = 'chat'),
        '11111111-1111-4111-8111-111111111111',
        'Hello Bob'
      )
      returning id
    )
    update wisp_test_runtime
    set value_uuid = (select id from inserted_message)
    where name = 'message'$$,
  'Alice can send a message to her direct chat'
);
select throws_ok(
  $$insert into public.wisp_messages (chat_id, sender_id, content)
    values (
      (select value_uuid from wisp_test_runtime where name = 'chat'),
      '11111111-1111-4111-8111-111111111111',
      repeat('x', 4001)
    )$$,
  '23514',
  'new row for relation "wisp_messages" violates check constraint "wisp_messages_content_length"',
  'message content is capped at the frontend limit of 4,000 characters'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',
  true
);
select results_eq(
  $$select content from public.wisp_messages
    where id = (select value_uuid from wisp_test_runtime where name = 'message')$$,
  $$values ('Hello Bob'::text)$$,
  'Bob can read a message in his chat'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (select count(*)::integer from public.wisp_messages),
  0,
  'an unrelated account cannot read another chat'
);
select is(
  (select count(*)::integer from public.wisp_chat_members),
  0,
  'chat membership RLS does not recurse or leak membership'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select lives_ok(
  $$insert into public.wisp_blocks (owner_id, blocked_id)
    values (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    )$$,
  'Alice can block Bob'
);
select throws_ok(
  $$insert into public.wisp_messages (chat_id, sender_id, content)
    values (
      (select value_uuid from wisp_test_runtime where name = 'chat'),
      '11111111-1111-4111-8111-111111111111',
      'This must not send'
    )$$,
  '42501',
  'new row violates row-level security policy for table "wisp_messages"',
  'blocking either participant stops new messages'
);
select ok(
  not wisp_private.can_signal_topic(
    'wisp-call:' || (
      select value_uuid::text from wisp_test_runtime where name = 'chat'
    )
  ),
  'blocking either participant also stops private call signaling'
);
delete from public.wisp_blocks
where owner_id = '11111111-1111-4111-8111-111111111111'
  and blocked_id = '22222222-2222-4222-8222-222222222222';
select ok(
  wisp_private.can_signal_topic(
    'wisp-call:' || (
      select value_uuid::text from wisp_test_runtime where name = 'chat'
    )
  ),
  'a member can authorize the exact private call topic after unblocking'
);
select ok(
  not wisp_private.can_signal_topic('wisp-call:not-a-uuid'),
  'malformed private call topics are rejected without casting errors'
);

select lives_ok(
  $$update wisp_test_runtime
    set value_uuid = (
      select call_id
      from public.wisp_start_call(
        (select value_uuid from wisp_test_runtime where name = 'chat'),
        'voice'
      )
    )
    where name = 'call'$$,
  'Alice can start a call through the guarded RPC'
);
select throws_ok(
  $$insert into public.wisp_calls (chat_id, initiated_by, call_type)
    values (
      (select value_uuid from wisp_test_runtime where name = 'chat'),
      '11111111-1111-4111-8111-111111111111',
      'voice'
    )$$,
  '42501',
  'permission denied for table wisp_calls',
  'call rows cannot be created directly'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select public.wisp_join_call(
      (select value_uuid from wisp_test_runtime where name = 'call')
    )$$,
  '42501',
  'This call is not available.',
  'an unrelated account cannot join the call'
);
select throws_ok(
  $$select public.wisp_end_call(
      (select value_uuid from wisp_test_runtime where name = 'call')
    )$$,
  '42501',
  'This call cannot be ended by the current account.',
  'an unrelated account cannot end the call'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',
  true
);
select ok(
  public.wisp_join_call(
    (select value_uuid from wisp_test_runtime where name = 'call')
  ),
  'Bob can join his direct-chat call'
);
select results_eq(
  $$select status from public.wisp_calls
    where id = (select value_uuid from wisp_test_runtime where name = 'call')$$,
  $$values ('active'::text)$$,
  'joining marks the call active'
);
select lives_ok(
  $$insert into public.wisp_blocks (owner_id, blocked_id)
    values (
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111'
    )$$,
  'a participant can block the other account while a call is active'
);
select ok(
  public.wisp_end_call(
    (select value_uuid from wisp_test_runtime where name = 'call')
  ),
  'a recorded participant can end the call even after blocking the peer'
);
select ok(
  public.wisp_end_call(
    (select value_uuid from wisp_test_runtime where name = 'call')
  ),
  'ending an already-ended call is idempotent for a recorded participant'
);
select results_eq(
  $$select status from public.wisp_calls
    where id = (select value_uuid from wisp_test_runtime where name = 'call')$$,
  $$values ('ended'::text)$$,
  'ending records the final lifecycle state'
);

select * from finish();
rollback;
