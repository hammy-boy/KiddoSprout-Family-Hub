-- Authorization and privacy tests for Wisp profile projection and presence.
begin;
set local search_path = public, extensions;
select no_plan();

select is(
  (select pg_proc.prosecdef from pg_proc where oid = 'public.wisp_get_own_profile()'::regprocedure),
  false,
  'the public own-profile wrapper is SECURITY INVOKER'
);
select is(
  (select pg_proc.prosecdef from pg_proc where oid = 'public.wisp_get_visible_profiles(uuid[])'::regprocedure),
  false,
  'the public visible-profile wrapper is SECURITY INVOKER'
);
select is(
  (select pg_proc.prosecdef from pg_proc where oid = 'public.wisp_set_presence(text)'::regprocedure),
  false,
  'the public presence wrapper is SECURITY INVOKER'
);
select is(
  (select pg_proc.prosecdef from pg_proc where oid = 'public.wisp_set_presence(text,uuid)'::regprocedure),
  false,
  'the account-bound presence wrapper is SECURITY INVOKER'
);
select is(
  (select pg_proc.prosecdef from pg_proc where oid = 'public.wisp_update_own_profile(jsonb)'::regprocedure),
  false,
  'the atomic profile update wrapper is SECURITY INVOKER'
);
select ok(
  (select bool_and(pg_proc.prosecdef)
   from pg_proc
   join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where pg_namespace.nspname = 'wisp_private'
     and pg_proc.proname in (
       'get_own_profile', 'get_visible_profiles', 'set_presence', 'update_own_profile'
     )),
  'all private profile helpers are SECURITY DEFINER'
);
select ok(
  (select bool_and(exists (
     select 1
     from unnest(coalesce(pg_proc.proconfig, array[]::text[])) as setting
     where setting ~ '^search_path=(""|)$'
   ))
   from pg_proc
   join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where pg_proc.proname in (
     'wisp_get_own_profile', 'wisp_get_visible_profiles', 'wisp_set_presence',
     'wisp_update_own_profile', 'get_own_profile', 'get_visible_profiles',
     'set_presence', 'update_own_profile'
   )
     and pg_namespace.nspname in ('public', 'wisp_private')),
  'profile and presence functions fix search_path to empty'
);

select ok(
  not has_function_privilege('anon', 'public.wisp_get_own_profile()', 'EXECUTE'),
  'anonymous clients cannot read private profile preferences'
);
select ok(
  has_function_privilege('authenticated', 'public.wisp_get_own_profile()', 'EXECUTE'),
  'authenticated clients can call the guarded own-profile RPC'
);
select ok(
  not has_function_privilege('anon', 'public.wisp_get_visible_profiles(uuid[])', 'EXECUTE'),
  'anonymous clients cannot enumerate Wisp profiles'
);
select ok(
  has_function_privilege('authenticated', 'public.wisp_set_presence(text)', 'EXECUTE'),
  'authenticated clients can call the guarded presence RPC'
);
select ok(
  not has_function_privilege('anon', 'public.wisp_set_presence(text,uuid)', 'EXECUTE'),
  'anonymous clients cannot call account-bound presence'
);
select ok(
  has_function_privilege('authenticated', 'public.wisp_set_presence(text,uuid)', 'EXECUTE'),
  'authenticated clients can call account-bound presence'
);
select ok(
  not has_function_privilege('anon', 'public.wisp_update_own_profile(jsonb)', 'EXECUTE'),
  'anonymous clients cannot call the profile update RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.wisp_update_own_profile(jsonb)', 'EXECUTE'),
  'authenticated clients can call the profile update RPC'
);

select ok(
  has_column_privilege('authenticated', 'public.wisp_profiles', 'username', 'SELECT'),
  'username remains a directly readable public profile field'
);
select ok(
  not has_column_privilege('authenticated', 'public.wisp_profiles', 'status', 'SELECT'),
  'raw presence status is not directly readable'
);
select ok(
  not has_column_privilege('authenticated', 'public.wisp_profiles', 'last_seen', 'SELECT'),
  'raw last-seen timestamps are not directly readable'
);
select ok(
  not has_column_privilege('authenticated', 'public.wisp_profiles', 'show_online_status', 'SELECT'),
  'another profile privacy preference is not directly readable'
);
select ok(
  not has_column_privilege('authenticated', 'public.wisp_profiles', 'show_read_receipts', 'SELECT'),
  'another read-receipt preference is not directly readable'
);
select ok(
  not has_column_privilege('authenticated', 'public.wisp_profiles', 'status', 'UPDATE'),
  'browser clients cannot forge their presence status'
);
select ok(
  not has_column_privilege('authenticated', 'public.wisp_profiles', 'last_seen', 'UPDATE'),
  'browser clients cannot forge last-seen timestamps'
);

insert into auth.users (id, email, is_anonymous)
values
  ('72000000-0000-4000-8000-000000000001', 'profile-alice@example.invalid', false),
  ('72000000-0000-4000-8000-000000000002', 'profile-bob@example.invalid', false),
  ('72000000-0000-4000-8000-000000000003', null, true);

insert into public.wisp_profiles (id, username, bio)
values
  ('72000000-0000-4000-8000-000000000001', 'ProfileAlice', 'Alice bio'),
  ('72000000-0000-4000-8000-000000000002', 'ProfileBob', 'Bob bio');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',
  true
);
select throws_ok(
  $$select public.wisp_set_presence('online')$$,
  '42501',
  'A permanent signed-in account is required.',
  'a Supabase anonymous user cannot publish presence'
);
select throws_ok(
  $$select * from public.wisp_update_own_profile('{"bio":"not allowed"}'::jsonb)$$,
  '42501',
  'A permanent signed-in account is required.',
  'a Supabase anonymous user cannot update a profile'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (select username from public.wisp_get_own_profile()),
  'ProfileAlice',
  'a permanent user can read their own full profile through the RPC'
);
select lives_ok(
  $$select public.wisp_set_presence('online')$$,
  'presence is set through a server-timestamped RPC'
);
select lives_ok(
  $$select public.wisp_set_presence(
      'online',
      '72000000-0000-4000-8000-000000000001'::uuid
    )$$,
  'presence can be bound to the expected signed-in account'
);
select throws_ok(
  $$select public.wisp_set_presence(
      'offline',
      '72000000-0000-4000-8000-000000000002'::uuid
    )$$,
  '42501',
  'The restored page no longer belongs to the signed-in account.',
  'a restored page cannot update presence after the account changes'
);
select throws_ok(
  $$select public.wisp_set_presence('away')$$,
  '22023',
  'Presence must be online or offline.',
  'unsupported presence states are rejected'
);
select throws_ok(
  $$select public.wisp_set_presence(null)$$,
  '22023',
  'Presence must be online or offline.',
  'a null presence state is rejected explicitly'
);
select is(
  (select username from public.wisp_update_own_profile(
    '{"username":"ProfileAliceUpdated","bio":"Updated safely","show_read_receipts":false}'::jsonb
  )),
  'ProfileAliceUpdated',
  'the allowlisted profile fields update atomically and return the committed row'
);
select is(
  (select show_read_receipts from public.wisp_get_own_profile()),
  false,
  'the committed privacy preference is immediately visible to its owner'
);
select throws_ok(
  $$select * from public.wisp_update_own_profile('{"status":"online"}'::jsonb)$$,
  '22023',
  'A requested profile field cannot be updated.',
  'the profile RPC rejects non-allowlisted fields'
);
select throws_ok(
  $$select * from public.wisp_update_own_profile('{"show_online_status":"yes"}'::jsonb)$$,
  '22023',
  'Online-status privacy must be true or false.',
  'the profile RPC rejects incorrect JSON types'
);
select throws_ok(
  $$select * from public.wisp_update_own_profile(
      jsonb_build_object('bio', repeat('x', 281))
    )$$,
  '22023',
  'Bio must be 280 characters or fewer.',
  'the profile RPC enforces the server-side biography limit'
);
select throws_ok(
  $$update public.wisp_profiles set status = 'offline'
    where id = '72000000-0000-4000-8000-000000000001'$$,
  '42501',
  'permission denied for table wisp_profiles',
  'presence cannot bypass the RPC with a direct update'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (select username from public.wisp_get_own_profile()),
  'ProfileBob',
  'updating one profile never changes another account'
);
select is(
  (select status from public.wisp_get_visible_profiles(
    array['72000000-0000-4000-8000-000000000001'::uuid]
  )),
  'online',
  'an opted-in fresh peer is projected as online'
);
select throws_ok(
  $$select * from public.wisp_get_visible_profiles(
      array_fill('72000000-0000-4000-8000-000000000001'::uuid, array[201])
    )$$,
  '22023',
  'At most 200 profiles can be requested.',
  'profile projection has a bounded input'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
update public.wisp_profiles
set show_online_status = false
where id = '72000000-0000-4000-8000-000000000001';

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select is(
  (select status from public.wisp_get_visible_profiles(
    array['72000000-0000-4000-8000-000000000001'::uuid]
  )),
  null::text,
  'an opted-out peer presence is redacted by the server'
);
select is(
  (select last_seen from public.wisp_get_visible_profiles(
    array['72000000-0000-4000-8000-000000000001'::uuid]
  )),
  null::timestamptz,
  'an opted-out peer last-seen timestamp is redacted by the server'
);
insert into public.wisp_blocks (owner_id, blocked_id)
values (
  '72000000-0000-4000-8000-000000000002',
  '72000000-0000-4000-8000-000000000001'
);
select is(
  (select count(*)::integer from public.wisp_get_visible_profiles(
    array['72000000-0000-4000-8000-000000000001'::uuid]
  )),
  0,
  'blocked profiles are omitted by the server projection'
);

select * from finish();
rollback;
