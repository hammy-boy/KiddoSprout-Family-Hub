-- One private family document per authenticated parent account. The browser
-- can reach this table only through Supabase's authenticated Data API role;
-- row-level security independently restricts every operation to auth.uid().

create table if not exists public.family_state (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  constraint family_state_is_object
    check (jsonb_typeof(state) = 'object'),
  constraint family_state_size_limit
    check (octet_length(state::text) <= 1048576),
  constraint family_state_no_top_level_credentials
    check (
      not state ?| array[
        'access_token',
        'refresh_token',
        'accountPassword',
        'parentPasscode',
        'password',
        'session',
        'supabaseSession'
      ]
    )
);

comment on table public.family_state is
  'Owner-scoped KiddoSprout family settings and child profiles.';
comment on column public.family_state.owner_id is
  'Supabase Auth user that owns this family document.';
comment on column public.family_state.state is
  'Validated JSON family document; raw credentials are forbidden.';

-- Keep updated_at server-controlled. This trigger is SECURITY INVOKER and has
-- no public EXECUTE grant; it does not bypass RLS or accept user input.
create or replace function public.touch_family_state_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end
$function$;

revoke all on function public.touch_family_state_updated_at()
  from public, anon, authenticated;

drop trigger if exists family_state_touch_updated_at on public.family_state;
create trigger family_state_touch_updated_at
  before update of state on public.family_state
  for each row
  execute function public.touch_family_state_updated_at();

alter table public.family_state enable row level security;

drop policy if exists family_state_select_own on public.family_state;
create policy family_state_select_own
  on public.family_state
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  );

drop policy if exists family_state_insert_own on public.family_state;
create policy family_state_insert_own
  on public.family_state
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  );

drop policy if exists family_state_update_own on public.family_state;
create policy family_state_update_own
  on public.family_state
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  );

-- Grants and RLS are separate. Explicit grants are required because current
-- Supabase projects no longer expose new public tables automatically.
revoke all privileges on table public.family_state
  from public, anon, authenticated;
grant usage on schema public to authenticated, service_role;
grant select on table public.family_state to authenticated;
grant insert (owner_id, state) on table public.family_state to authenticated;
grant update (state) on table public.family_state to authenticated;

-- Trusted server operations remain available without putting a service-role
-- key in browser code. service_role bypasses RLS and must remain server-only.
grant select, insert, update, delete on table public.family_state to service_role;

notify pgrst, 'reload schema';
