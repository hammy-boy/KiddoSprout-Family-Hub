begin;
set local search_path = public, extensions;
select plan(16);

select has_table('public', 'family_state', 'family_state table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.family_state'::regclass),
  'family_state has RLS enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'family_state'),
  3,
  'family_state has separate select, insert, and update policies'
);
select ok(not has_table_privilege('anon', 'public.family_state', 'SELECT'), 'anonymous visitors cannot select family state');
select ok(has_table_privilege('authenticated', 'public.family_state', 'SELECT'), 'authenticated parents can select');
select ok(has_column_privilege('authenticated', 'public.family_state', 'owner_id', 'INSERT'), 'authenticated parents can insert an owner');
select ok(has_column_privilege('authenticated', 'public.family_state', 'state', 'UPDATE'), 'authenticated parents can update state');
select ok(not has_table_privilege('authenticated', 'public.family_state', 'DELETE'), 'browser clients cannot delete family state');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'family-one@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'family-two@example.invalid');

insert into public.family_state (owner_id, state)
values
  ('11111111-1111-4111-8111-111111111111', '{"familyName":"One"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', '{"familyName":"Two"}'::jsonb);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.family_state),
  1,
  'an authenticated parent sees only their own family row'
);
select lives_ok(
  $$insert into public.family_state (owner_id, state)
    values ('11111111-1111-4111-8111-111111111111', '{"familyName":"One updated"}'::jsonb)
    on conflict (owner_id) do update set state = excluded.state$$,
  'an authenticated parent can upsert their own family state'
);
select throws_ok(
  $$insert into public.family_state (owner_id, state)
    values ('22222222-2222-4222-8222-222222222222', '{"familyName":"Stolen"}'::jsonb)
    on conflict (owner_id) do update set state = excluded.state$$,
  '42501',
  'new row violates row-level security policy for table "family_state"',
  'an authenticated parent cannot upsert another owner''s state'
);
select lives_ok(
  $$update public.family_state set state = '{"familyName":"Mine"}'::jsonb
    where owner_id = '11111111-1111-4111-8111-111111111111'$$,
  'an authenticated parent can update their own row'
);
select is(
  (select state ->> 'familyName' from public.family_state
    where owner_id = '11111111-1111-4111-8111-111111111111'),
  'Mine',
  'the owner update changed the visible family row'
);
select lives_ok(
  $$update public.family_state set state = '{"familyName":"Not mine"}'::jsonb
    where owner_id = '22222222-2222-4222-8222-222222222222'$$,
  'an update against a hidden owner row safely affects nothing'
);

reset role;
select is(
  (select state ->> 'familyName' from public.family_state
    where owner_id = '22222222-2222-4222-8222-222222222222'),
  'Two',
  'another owner''s family state was not changed'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select throws_ok(
  $$insert into public.family_state (owner_id, state)
    values ('11111111-1111-4111-8111-111111111111', '{"access_token":"never"}'::jsonb)
    on conflict (owner_id) do update set state = excluded.state$$,
  '23514',
  'new row for relation "family_state" violates check constraint "family_state_no_top_level_credentials"',
  'the database rejects top-level credential fields'
);

select * from finish();
rollback;
