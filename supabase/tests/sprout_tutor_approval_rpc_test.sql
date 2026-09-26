begin;
set local search_path = public, extensions;
select plan(11);

select has_function(
  'public',
  'sprout_tutor_active_child_approval',
  array['text']::name[],
  'the narrow Sprout Tutor approval RPC exists'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.sprout_tutor_active_child_approval(text)'::regprocedure
  ),
  false,
  'the approval RPC is SECURITY INVOKER'
);
select is(
  (
    select provolatile::text
    from pg_proc
    where oid = 'public.sprout_tutor_active_child_approval(text)'::regprocedure
  ),
  's',
  'the approval RPC is STABLE'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.sprout_tutor_active_child_approval(text)',
    'EXECUTE'
  ),
  'anonymous visitors cannot execute the approval RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.sprout_tutor_active_child_approval(text)',
    'EXECUTE'
  ),
  'authenticated parents can execute the approval RPC'
);
select unlike(
  pg_get_function_result('public.sprout_tutor_active_child_approval(text)'::regprocedure),
  '%json%',
  'the RPC signature does not return the family JSON document'
);

insert into auth.users (id, email)
values
  ('33333333-3333-4333-8333-333333333333', 'tutor-one@example.invalid'),
  ('44444444-4444-4444-8444-444444444444', 'tutor-two@example.invalid');

insert into public.family_state (owner_id, state)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '{"parentAccountCreated":true,"activeChild":"learner-one","children":{"learner-one":{"name":"Private name","appRules":{"sproutTutor":"allowed"}}}}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '{"parentAccountCreated":true,"activeChild":"learner-two","children":{"learner-two":{"name":"Other private name","appRules":{"sproutTutor":"allowed"}}}}'::jsonb
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);

select results_eq(
  $$select child_id, approved from public.sprout_tutor_active_child_approval('learner-one')$$,
  $$values ('learner-one'::text, true)$$,
  'a parent receives only their active child ID and an allowed result'
);

select is_empty(
  $$select * from public.sprout_tutor_active_child_approval('learner-two')$$,
  'a stale browser child cannot silently switch to the server-side active child'
);

update public.family_state
set state = jsonb_set(state, '{children,learner-one,appRules,sproutTutor}', '"request"')
where owner_id = '33333333-3333-4333-8333-333333333333';

select results_eq(
  $$select child_id, approved from public.sprout_tutor_active_child_approval('learner-one')$$,
  $$values ('learner-one'::text, false)$$,
  'a non-allowed rule returns false without exposing the child profile'
);

update public.family_state
set state = jsonb_set(state, '{activeChild}', '"../unsafe"')
where owner_id = '33333333-3333-4333-8333-333333333333';

select is_empty(
  $$select * from public.sprout_tutor_active_child_approval('../unsafe')$$,
  'an unsafe active-child identifier is rejected'
);

update public.family_state
set state = '{"parentAccountCreated":false,"activeChild":"learner-one","children":{"learner-one":{"appRules":{"sproutTutor":"allowed"}}}}'::jsonb
where owner_id = '33333333-3333-4333-8333-333333333333';

select results_eq(
  $$select child_id, approved from public.sprout_tutor_active_child_approval('learner-one')$$,
  $$values ('learner-one'::text, false)$$,
  'an incomplete parent account cannot approve the tutor'
);

select * from finish();
rollback;
