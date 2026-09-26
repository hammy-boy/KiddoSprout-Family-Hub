-- Give the Sprout Tutor Worker the minimum parent-approval data it needs.
-- The function runs as the signed-in parent, so the existing family_state RLS
-- policy and the explicit owner predicate both restrict it to that family.

drop function if exists public.sprout_tutor_active_child_approval();

create or replace function public.sprout_tutor_active_child_approval(
  p_expected_child_id text
)
returns table (
  child_id text,
  approved boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    active_child.child_id,
    coalesce((
      family.state ->> 'parentAccountCreated' = 'true'
      and jsonb_typeof(family.state -> 'children') = 'object'
      and jsonb_typeof(
        family.state -> 'children' -> active_child.child_id
      ) = 'object'
      and family.state
        -> 'children'
        -> active_child.child_id
        -> 'appRules'
        ->> 'sproutTutor' = 'allowed'
    ), false) as approved
  from public.family_state as family
  cross join lateral (
    select family.state ->> 'activeChild' as child_id
  ) as active_child
  where (select auth.uid()) is not null
    and family.owner_id = (select auth.uid())
    and active_child.child_id = p_expected_child_id
    and char_length(p_expected_child_id) between 1 and 160
    and p_expected_child_id ~ '^[a-z0-9][a-z0-9_-]{0,159}$'
    and p_expected_child_id not in ('__proto__', 'constructor', 'prototype')
    and char_length(active_child.child_id) between 1 and 160
    and active_child.child_id ~ '^[a-z0-9][a-z0-9_-]{0,159}$'
    and active_child.child_id not in ('__proto__', 'constructor', 'prototype');
$function$;

comment on function public.sprout_tutor_active_child_approval(text) is
  'Returns only the signed-in parent''s active child ID and Sprout Tutor approval when it matches the child expected by the browser; never returns the family JSON document.';

revoke all on function public.sprout_tutor_active_child_approval(text)
  from public, anon, authenticated;
grant execute on function public.sprout_tutor_active_child_approval(text)
  to authenticated;

notify pgrst, 'reload schema';
