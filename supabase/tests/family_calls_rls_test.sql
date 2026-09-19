-- Security and lifecycle tests for phone-number-free child-to-parent calls.
-- WebRTC offers, answers, ICE candidates, audio, and raw pairing tokens must
-- remain ephemeral; only minimal membership/call lifecycle rows are stored.
begin;
set local search_path = public, extensions;
select plan(63);

select has_table('public', 'family_call_members', 'call membership table exists');
select has_table('public', 'family_call_pairings', 'pairing table exists');
select has_table('public', 'family_calls', 'call lifecycle table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.family_call_members'::regclass),
  'call membership has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.family_call_pairings'::regclass),
  'pairing table has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.family_calls'::regclass),
  'call lifecycle has RLS enabled'
);
select ok(
  not has_table_privilege('authenticated', 'public.family_call_pairings', 'SELECT'),
  'browser sessions cannot read pairing hashes'
);
select ok(
  not has_table_privilege('authenticated', 'public.family_calls', 'INSERT'),
  'browser sessions cannot directly create calls'
);
select is(
  (
    select count(*)::integer
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = any(array[
        'create_family_call_pairing',
        'claim_family_call_pairing',
        'start_family_call',
        'accept_family_call',
        'decline_family_call',
        'cancel_family_call',
        'end_family_call',
        'get_child_call_device',
        'revoke_child_call_device'
      ])
  ),
  9,
  'only the nine narrowly scoped public call RPCs are present'
);
select ok(
  not has_function_privilege('anon', 'public.start_family_call(uuid)', 'EXECUTE'),
  'unauthenticated visitors cannot execute call RPCs'
);
select ok(
  has_function_privilege('authenticated', 'public.start_family_call(uuid)', 'EXECUTE'),
  'authenticated identities can reach the guarded start RPC'
);
select ok(
  not has_schema_privilege('anon', 'kiddosprout_private', 'USAGE'),
  'unauthenticated visitors cannot use the private implementation schema'
);
select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('family_call_members', 'family_call_pairings', 'family_calls')
      and column_name in (
        'offer', 'answer', 'sdp', 'candidate', 'ice_candidate', 'signal',
        'payload', 'audio', 'recording', 'pairing_token'
      )
  ),
  0,
  'no raw tokens, signals, SDP, ICE, audio, or recordings are stored'
);
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'family_state'
      and concat_ws(' ', qual, with_check) like '%is_anonymous%'
  ),
  3,
  'all family-state policies reject anonymous Auth users'
);
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recipes'
      and concat_ws(' ', qual, with_check) like '%is_anonymous%'
  ),
  4,
  'all recipe policies reject anonymous Auth users'
);
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname like 'family_call_%'
  ),
  3,
  'private Realtime Broadcast has three least-privilege policies'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'family_call_parent_receive_rings'
      and qual like '%family-rings:%'
  ),
  'ring notifications are authorized only through family-rings topics'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'family_call_participant_receive_signals'
      and qual like '%family-call:%'
  ),
  'call subscribers are authorized through call-specific private topics'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'family_call_participant_send_signals'
      and with_check like '%offer%'
      and with_check like '%answer%'
      and with_check like '%ice%'
      and with_check like '%hangup%'
  ),
  'call publishers are limited to the approved ephemeral signaling events'
);

insert into auth.users (id, email, is_anonymous)
values
  ('11111111-1111-4111-8111-111111111111', 'parent-one@example.invalid', false),
  ('22222222-2222-4222-8222-222222222222', 'parent-two@example.invalid', false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, true),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', null, true);

insert into public.family_state (owner_id, state)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '{"parentName":"Parent One","children":{"kid-a":{"name":"Kid A"}}}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '{"parentName":"Parent Two","children":{"kid-b":{"name":"Kid B"}}}'::jsonb
  );

create temp table call_test_runtime (
  scenario text primary key,
  pairing_token text,
  call_id uuid
);
insert into call_test_runtime (scenario)
values
  ('main'),
  ('decline'),
  ('expired'),
  ('active-expired'),
  ('after-active-expiry'),
  ('replacement');
grant select, insert, update on table call_test_runtime to authenticated;

-- An anonymous Auth user is still the database `authenticated` role. Before
-- pairing it cannot read/write parent data and cannot start a call.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated","is_anonymous":true}',
  true
);
select is(
  (select count(*)::integer from public.family_state),
  0,
  'an anonymous child identity cannot read parent family state'
);
select throws_ok(
  $$insert into public.recipes (user_id, title, category, ingredients, steps)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'Not allowed', 'Other', array['One'], array['One']
    )$$,
  '42501',
  'new row violates row-level security policy for table "recipes"',
  'an anonymous child identity cannot write a private recipe'
);
select throws_ok(
  $$select * from public.start_family_call(null)$$,
  '42501',
  'This child device is not paired with an active profile.',
  'an anonymous child is denied before pairing'
);

-- A permanent parent creates a short-lived token. The database stores only
-- its SHA-256 hash; the raw value exists only in this test client table.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select lives_ok(
  $$update call_test_runtime
    set pairing_token = (
      select pairing_token from public.create_family_call_pairing('kid-a')
    )
    where scenario = 'main'$$,
  'a parent can create a child-device pairing token'
);
select is(
  (select char_length(pairing_token) from call_test_runtime where scenario = 'main'),
  48,
  'the returned pairing token has 192 bits of random hex data'
);
select throws_ok(
  $$select * from public.family_call_pairings$$,
  '42501',
  'permission denied for table family_call_pairings',
  'even the parent cannot query stored pairing hashes directly'
);

reset role;
select is(
  (
    select count(*)::integer
    from public.family_call_pairings as pairing
    join call_test_runtime as runtime on runtime.scenario = 'main'
    where pairing.token_hash = runtime.pairing_token
  ),
  0,
  'the raw pairing token is not stored'
);
select is(
  (select char_length(token_hash) from public.family_call_pairings limit 1),
  64,
  'only a SHA-256 pairing-token hash is stored'
);

-- The anonymous child claims the one-use token, then receives only its own
-- membership row. A different anonymous identity cannot replay the token.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select lives_ok(
  $$select * from public.claim_family_call_pairing(
      (select pairing_token from call_test_runtime where scenario = 'main')
    )$$,
  'the intended anonymous child device can claim the pairing token'
);
select is(
  (select count(*)::integer from public.family_call_members where revoked_at is null),
  1,
  'the paired child sees only its own active membership'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated","is_anonymous":true}',
  true
);
select throws_ok(
  $$select * from public.claim_family_call_pairing(
      (select pairing_token from call_test_runtime where scenario = 'main')
    )$$,
  'P0001',
  'The pairing code is unavailable or expired.',
  'a pairing token cannot be replayed by another anonymous identity'
);

-- The paired child can call only its own parent. Direct table writes and
-- cross-family actions stay blocked by grants, RLS, and exact-action RPCs.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select throws_ok(
  $$select * from public.start_family_call('22222222-2222-4222-8222-222222222222')$$,
  '42501',
  'That parent is not available for family calls.',
  'a child cannot call a parent in another family'
);
select lives_ok(
  $$update call_test_runtime
    set call_id = (select call_id from public.start_family_call(null))
    where scenario = 'main'$$,
  'a paired child can start a call to its parent'
);
select is(
  (
    select status
    from public.family_calls
    where id = (select call_id from call_test_runtime where scenario = 'main')
  ),
  'ringing',
  'the child sees its own ringing call'
);
select throws_ok(
  $$update public.family_calls set status = 'active'
    where id = (select call_id from call_test_runtime where scenario = 'main')$$,
  '42501',
  'permission denied for table family_calls',
  'a child cannot bypass the lifecycle RPC with a direct update'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (select count(*)::integer from public.family_calls),
  0,
  'a different family parent cannot see the ringing call'
);
select is(
  (select count(*)::integer from public.get_child_call_device('kid-a')),
  0,
  'a different family parent cannot discover the paired child device'
);
select throws_ok(
  $$select * from public.accept_family_call(
      (select call_id from call_test_runtime where scenario = 'main')
    )$$,
  '42501',
  'The family call cannot perform that action.',
  'a different family parent cannot accept the call'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (select count(*)::integer from public.family_calls),
  1,
  'the intended parent sees the incoming call'
);
select is(
  (select child_user_id from public.get_child_call_device('kid-a')),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'the owning parent can discover the one active device for a selected child'
);
select is(
  (
    select call_status
    from public.accept_family_call(
      (select call_id from call_test_runtime where scenario = 'main')
    )
  ),
  'active',
  'the intended parent can accept the ringing call'
);
select is(
  (
    select status
    from public.family_calls
    where id = (select call_id from call_test_runtime where scenario = 'main')
  ),
  'active',
  'accepting persists the active lifecycle state'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select is(
  (
    select call_status
    from public.end_family_call(
      (select call_id from call_test_runtime where scenario = 'main')
    )
  ),
  'ended',
  'either participant can end an active call'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select * from public.accept_family_call(
      (select call_id from call_test_runtime where scenario = 'main')
    )$$,
  '42501',
  'The family call cannot perform that action.',
  'an ended call cannot return to active state'
);
select is(
  (
    select status
    from public.family_calls
    where id = (select call_id from call_test_runtime where scenario = 'main')
  ),
  'ended',
  'the ended call remains immutable through lifecycle RPCs'
);

-- Decline and expiry are separate terminal transitions. An expired ring is
-- atomically marked missed and cannot later become active.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select lives_ok(
  $$update call_test_runtime
    set call_id = (select call_id from public.start_family_call(null))
    where scenario = 'decline'$$,
  'the child can start another call after the first one ends'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select call_status
    from public.decline_family_call(
      (select call_id from call_test_runtime where scenario = 'decline')
    )
  ),
  'declined',
  'the intended parent can decline a ringing call'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select lives_ok(
  $$update call_test_runtime
    set call_id = (select call_id from public.start_family_call(null))
    where scenario = 'expired'$$,
  'the child can start a call for the expiry scenario'
);

reset role;
update public.family_calls
set
  created_at = statement_timestamp() - interval '2 minutes',
  expires_at = statement_timestamp() - interval '1 minute'
where id = (select call_id from call_test_runtime where scenario = 'expired');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select call_status
    from public.accept_family_call(
      (select call_id from call_test_runtime where scenario = 'expired')
    )
  ),
  'missed',
  'accepting an expired ring returns the terminal missed state'
);
select is(
  (
    select status
    from public.family_calls
    where id = (select call_id from call_test_runtime where scenario = 'expired')
  ),
  'missed',
  'an expired call is persisted as missed, never active'
);

-- Expired active calls must not remain in the partial unique indexes forever.
-- Starting a later call sweeps the stale active row to ended first.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select lives_ok(
  $$update call_test_runtime
    set call_id = (select call_id from public.start_family_call(null))
    where scenario = 'active-expired'$$,
  'the child can start the active-expiry scenario call'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (
    select call_status
    from public.accept_family_call(
      (select call_id from call_test_runtime where scenario = 'active-expired')
    )
  ),
  'active',
  'the active-expiry scenario reaches active state'
);

reset role;
update public.family_calls
set
  created_at = statement_timestamp() - interval '2 hours',
  expires_at = statement_timestamp() - interval '1 hour'
where id = (select call_id from call_test_runtime where scenario = 'active-expired');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select lives_ok(
  $$update call_test_runtime
    set call_id = (select call_id from public.start_family_call(null))
    where scenario = 'after-active-expiry'$$,
  'a stale active call does not permanently block a later call'
);

reset role;
select is(
  (
    select status
    from public.family_calls
    where id = (select call_id from call_test_runtime where scenario = 'active-expired')
  ),
  'ended',
  'the stale active call is swept to ended'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select is(
  (
    select call_status
    from public.cancel_family_call(
      (select call_id from call_test_runtime where scenario = 'after-active-expiry')
    )
  ),
  'cancelled',
  'the caller can cancel the post-expiry test ring'
);

-- A fresh pairing atomically replaces the former device for that child. This
-- leaves exactly one active identity, which the parent can discover and revoke
-- through narrow RPCs without broad membership-table read access.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select lives_ok(
  $$update call_test_runtime
    set pairing_token = (
      select pairing_token from public.create_family_call_pairing('kid-a')
    )
    where scenario = 'replacement'$$,
  'the parent can create a replacement child-device pairing token'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated","is_anonymous":true}',
  true
);
select lives_ok(
  $$select * from public.claim_family_call_pairing(
      (select pairing_token from call_test_runtime where scenario = 'replacement')
    )$$,
  'a new anonymous child identity can claim the replacement pairing'
);

reset role;
select is(
  (
    select count(*)::integer
    from public.family_call_members
    where family_owner_id = '11111111-1111-4111-8111-111111111111'
      and child_profile_id = 'kid-a'
      and role = 'child'
      and revoked_at is null
  ),
  1,
  'only one child device remains active for a family profile'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (select child_user_id from public.get_child_call_device('kid-a')),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'the parent device lookup returns only the replacement identity'
);
select is(
  public.revoke_child_call_device('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  true,
  'the owning parent can revoke the replacement child device'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":true}',
  true
);
select is(
  (select count(*)::integer from public.family_calls),
  0,
  'the automatically replaced child can no longer read prior call rows'
);
select throws_ok(
  $$select * from public.start_family_call(null)$$,
  '42501',
  'This child device is not paired with an active profile.',
  'the automatically replaced child cannot start another call'
);
select throws_ok(
  $$select * from public.create_family_call_pairing('kid-a')$$,
  '42501',
  'A verified parent account is required to pair a child device.',
  'an anonymous child cannot mint a pairing token'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated","is_anonymous":true}',
  true
);
select throws_ok(
  $$select * from public.start_family_call(null)$$,
  '42501',
  'This child device is not paired with an active profile.',
  'a directly revoked replacement device cannot start another call'
);

select * from finish();
rollback;
