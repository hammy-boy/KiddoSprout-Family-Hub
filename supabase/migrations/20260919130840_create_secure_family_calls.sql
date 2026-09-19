-- KiddoSprout family audio calls use Supabase Auth only for identity and
-- private Realtime Broadcast only for ephemeral WebRTC signalling. This
-- schema never stores SDP, ICE candidates, audio, recordings, or raw pairing
-- tokens. A child device is an explicitly paired anonymous Auth user; it must
-- never reuse the parent's browser session.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists kiddosprout_private;
revoke all on schema kiddosprout_private from public, anon, authenticated;
grant usage on schema kiddosprout_private to authenticated, service_role;

-- Anonymous Auth users use the `authenticated` Postgres role. Tighten the
-- existing parent-owned tables before anonymous sign-in is enabled so a child
-- device cannot create a second family document or a private recipe library.
drop policy if exists recipes_select_own on public.recipes;
create policy recipes_select_own
  on public.recipes
  for select
  to authenticated
  using (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = user_id
  );

drop policy if exists recipes_insert_own on public.recipes;
create policy recipes_insert_own
  on public.recipes
  for insert
  to authenticated
  with check (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = user_id
  );

drop policy if exists recipes_update_own on public.recipes;
create policy recipes_update_own
  on public.recipes
  for update
  to authenticated
  using (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = user_id
  )
  with check (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = user_id
  );

drop policy if exists recipes_delete_own on public.recipes;
create policy recipes_delete_own
  on public.recipes
  for delete
  to authenticated
  using (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = user_id
  );

drop policy if exists family_state_select_own on public.family_state;
create policy family_state_select_own
  on public.family_state
  for select
  to authenticated
  using (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = owner_id
  );

drop policy if exists family_state_insert_own on public.family_state;
create policy family_state_insert_own
  on public.family_state
  for insert
  to authenticated
  with check (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = owner_id
  );

drop policy if exists family_state_update_own on public.family_state;
create policy family_state_update_own
  on public.family_state
  for update
  to authenticated
  using (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = owner_id
  )
  with check (
    coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and (select auth.uid()) = owner_id
  );

create table if not exists public.family_call_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_owner_id uuid not null references public.family_state (owner_id) on delete cascade,
  role text not null,
  child_profile_id text,
  display_name text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint family_call_members_family_user_unique
    unique (family_owner_id, user_id),
  constraint family_call_members_role
    check (role in ('parent', 'child')),
  constraint family_call_members_role_shape
    check (
      (role = 'parent' and child_profile_id is null)
      or
      (
        role = 'child'
        and child_profile_id is not null
        and child_profile_id ~ '^[a-z0-9][a-z0-9_-]{0,159}$'
      )
    ),
  constraint family_call_members_display_name
    check (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 80
    )
);

comment on table public.family_call_members is
  'Revocable authenticated devices allowed to take part in one KiddoSprout family call.';
comment on column public.family_call_members.child_profile_id is
  'Existing family_state children object key represented by an anonymous child-device user.';

create index if not exists family_call_members_family_role_idx
  on public.family_call_members (family_owner_id, role)
  where revoked_at is null;
create unique index if not exists family_call_members_one_active_child_device_idx
  on public.family_call_members (family_owner_id, child_profile_id)
  where role = 'child' and revoked_at is null;

create table if not exists public.family_call_pairings (
  id uuid primary key default gen_random_uuid(),
  family_owner_id uuid not null references public.family_state (owner_id) on delete cascade,
  child_profile_id text not null,
  token_hash character(64) not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint family_call_pairings_child_profile_id
    check (child_profile_id ~ '^[a-z0-9][a-z0-9_-]{0,159}$'),
  constraint family_call_pairings_token_hash
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint family_call_pairings_expiry
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '15 minutes'
    ),
  constraint family_call_pairings_claim_shape
    check (
      (claimed_at is null and claimed_by is null)
      -- claimed_by is cleared if the anonymous Auth user is deleted, while
      -- claimed_at continues to make the one-use token permanently unusable.
      or claimed_at is not null
    )
);

comment on table public.family_call_pairings is
  'Short-lived one-use hashes for pairing anonymous child devices. Raw tokens are never stored.';

create index if not exists family_call_pairings_owner_child_idx
  on public.family_call_pairings (family_owner_id, child_profile_id, created_at desc);

create table if not exists public.family_calls (
  id uuid primary key default gen_random_uuid(),
  family_owner_id uuid not null references public.family_state (owner_id) on delete cascade,
  child_profile_id text not null,
  caller_user_id uuid not null,
  callee_user_id uuid not null,
  status text not null default 'ringing',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 seconds'),
  answered_at timestamptz,
  ended_at timestamptz,
  constraint family_calls_caller_member
    foreign key (family_owner_id, caller_user_id)
    references public.family_call_members (family_owner_id, user_id)
    on delete cascade,
  constraint family_calls_callee_member
    foreign key (family_owner_id, callee_user_id)
    references public.family_call_members (family_owner_id, user_id)
    on delete cascade,
  constraint family_calls_child_profile_id
    check (child_profile_id ~ '^[a-z0-9][a-z0-9_-]{0,159}$'),
  constraint family_calls_distinct_participants
    check (caller_user_id <> callee_user_id),
  constraint family_calls_status
    check (status in ('ringing', 'active', 'declined', 'cancelled', 'ended', 'missed')),
  constraint family_calls_expiry
    check (expires_at > created_at),
  constraint family_calls_status_timestamps
    check (
      (status = 'ringing' and answered_at is null and ended_at is null)
      or (status = 'active' and answered_at is not null and ended_at is null)
      or (status in ('declined', 'cancelled', 'missed') and answered_at is null and ended_at is not null)
      or (status = 'ended' and answered_at is not null and ended_at is not null)
    )
);

comment on table public.family_calls is
  'Minimal call lifecycle metadata; WebRTC descriptions, candidates, and media are never persisted.';

create index if not exists family_calls_callee_status_idx
  on public.family_calls (callee_user_id, status, expires_at desc);
create index if not exists family_calls_caller_recent_idx
  on public.family_calls (caller_user_id, created_at desc);
create unique index if not exists family_calls_one_live_caller_idx
  on public.family_calls (caller_user_id)
  where status in ('ringing', 'active');
create unique index if not exists family_calls_one_live_callee_idx
  on public.family_calls (callee_user_id)
  where status in ('ringing', 'active');

-- Every real family owner is also its primary parent call member. Do not
-- backfill an anonymous family row if one was created before this hardening
-- migration was installed.
insert into public.family_call_members (
  user_id,
  family_owner_id,
  role,
  child_profile_id,
  display_name
)
select
  family.owner_id,
  family.owner_id,
  'parent',
  null,
  left(coalesce(nullif(btrim(family.state ->> 'parentName'), ''), 'Parent'), 80)
from public.family_state as family
join auth.users as account on account.id = family.owner_id
where coalesce(account.is_anonymous, false) = false
on conflict (user_id) do update
set
  family_owner_id = excluded.family_owner_id,
  role = 'parent',
  child_profile_id = null,
  display_name = excluded.display_name,
  revoked_at = null;

alter table public.family_call_members enable row level security;
alter table public.family_call_pairings enable row level security;
alter table public.family_calls enable row level security;

drop policy if exists family_call_members_select_self on public.family_call_members;
create policy family_call_members_select_self
  on public.family_call_members
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Pairings intentionally have no browser table policy or grant. Their raw
-- token is returned once from the narrowly scoped create RPC, and claiming is
-- an atomic private operation.

drop policy if exists family_calls_select_participant on public.family_calls;
create policy family_calls_select_participant
  on public.family_calls
  for select
  to authenticated
  using (
    (select auth.uid()) in (caller_user_id, callee_user_id)
    and exists (
      select 1
      from public.family_call_members as member
      where member.user_id = (select auth.uid())
        and member.family_owner_id = family_calls.family_owner_id
        and member.revoked_at is null
    )
  );

revoke all privileges on table public.family_call_members
  from public, anon, authenticated;
revoke all privileges on table public.family_call_pairings
  from public, anon, authenticated;
revoke all privileges on table public.family_calls
  from public, anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant select on table public.family_call_members to authenticated;
grant select on table public.family_calls to authenticated;
grant select, insert, update, delete on table public.family_call_members to service_role;
grant select, insert, update, delete on table public.family_call_pairings to service_role;
grant select, insert, update, delete on table public.family_calls to service_role;

create or replace function kiddosprout_private.sync_family_call_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := statement_timestamp();
begin
  insert into public.family_call_members (
    user_id,
    family_owner_id,
    role,
    child_profile_id,
    display_name
  )
  values (
    new.owner_id,
    new.owner_id,
    'parent',
    null,
    left(coalesce(nullif(btrim(new.state ->> 'parentName'), ''), 'Parent'), 80)
  )
  on conflict (user_id) do update
  set
    family_owner_id = excluded.family_owner_id,
    role = 'parent',
    child_profile_id = null,
    display_name = excluded.display_name,
    revoked_at = null;

  if tg_op = 'UPDATE' then
    update public.family_call_members as member
    set revoked_at = v_now
    where member.family_owner_id = new.owner_id
      and member.role = 'child'
      and member.revoked_at is null
      and not (
        jsonb_typeof(new.state -> 'children') = 'object'
        and (new.state -> 'children') ? member.child_profile_id
      );

    update public.family_calls as family_call
    set
      status = case
        when family_call.status = 'ringing' then 'cancelled'
        else 'ended'
      end,
      ended_at = v_now,
      expires_at = greatest(v_now, family_call.created_at + interval '1 microsecond')
    where family_call.family_owner_id = new.owner_id
      and family_call.status in ('ringing', 'active')
      and exists (
        select 1
        from public.family_call_members as removed_member
        where removed_member.family_owner_id = new.owner_id
          and removed_member.user_id = family_call.caller_user_id
          and removed_member.role = 'child'
          and removed_member.revoked_at = v_now
      );

    delete from public.family_call_pairings as pairing
    where pairing.family_owner_id = new.owner_id
      and pairing.claimed_at is null
      and not (
        jsonb_typeof(new.state -> 'children') = 'object'
        and (new.state -> 'children') ? pairing.child_profile_id
      );
  end if;

  return new;
end
$function$;

revoke all on function kiddosprout_private.sync_family_call_members()
  from public, anon, authenticated, service_role;

drop trigger if exists family_state_sync_call_members on public.family_state;
create trigger family_state_sync_call_members
  after insert or update of state on public.family_state
  for each row
  execute function kiddosprout_private.sync_family_call_members();

create or replace function kiddosprout_private.create_family_call_pairing(
  p_child_profile_id text
)
returns table (
  pairing_token text,
  pairing_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  v_family_owner_id uuid;
  raw_token text;
  hashed_token text;
  expiry timestamptz := statement_timestamp() + interval '10 minutes';
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A verified parent account is required to pair a child device.';
  end if;

  if p_child_profile_id is null
     or p_child_profile_id !~ '^[a-z0-9][a-z0-9_-]{0,159}$' then
    raise exception using
      errcode = '22023',
      message = 'The child profile is not valid.';
  end if;

  select member.family_owner_id
  into v_family_owner_id
  from public.family_call_members as member
  where member.user_id = actor_id
    and member.role = 'parent'
    and member.revoked_at is null;

  if v_family_owner_id is null
     or not exists (
       select 1
       from public.family_state as family
       where family.owner_id = v_family_owner_id
         and jsonb_typeof(family.state -> 'children') = 'object'
         and (family.state -> 'children') ? p_child_profile_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'The parent cannot pair that child profile.';
  end if;

  delete from public.family_call_pairings as old_pairing
  where old_pairing.family_owner_id = v_family_owner_id
    and old_pairing.child_profile_id = p_child_profile_id
    and old_pairing.claimed_at is null;

  raw_token := encode(extensions.gen_random_bytes(24), 'hex');
  hashed_token := encode(
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.family_call_pairings (
    family_owner_id,
    child_profile_id,
    token_hash,
    created_by,
    expires_at
  )
  values (
    v_family_owner_id,
    p_child_profile_id,
    hashed_token,
    actor_id,
    expiry
  );

  return query select raw_token, expiry;
end
$function$;

create or replace function kiddosprout_private.claim_family_call_pairing(
  p_pairing_token text
)
returns table (
  family_owner_id uuid,
  child_profile_id text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  hashed_token text;
  pairing_record public.family_call_pairings%rowtype;
  child_name text;
  existing_member public.family_call_members%rowtype;
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception using
      errcode = '42501',
      message = 'An anonymous child-device session is required for pairing.';
  end if;

  if p_pairing_token is null or p_pairing_token !~ '^[0-9a-f]{48}$' then
    raise exception using
      errcode = '22023',
      message = 'The pairing code is not valid.';
  end if;

  hashed_token := encode(
    extensions.digest(convert_to(p_pairing_token, 'UTF8'), 'sha256'),
    'hex'
  );

  select pairing.*
  into pairing_record
  from public.family_call_pairings as pairing
  where pairing.token_hash = hashed_token
  for update;

  if not found or pairing_record.expires_at <= statement_timestamp() then
    raise exception using
      errcode = 'P0001',
      message = 'The pairing code is unavailable or expired.';
  end if;

  if pairing_record.claimed_at is not null then
    if pairing_record.claimed_by = actor_id
       and exists (
         select 1
         from public.family_call_members as member
         where member.user_id = actor_id
           and member.family_owner_id = pairing_record.family_owner_id
           and member.child_profile_id = pairing_record.child_profile_id
           and member.role = 'child'
           and member.revoked_at is null
       ) then
      return query
      select pairing_record.family_owner_id, pairing_record.child_profile_id;
      return;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'The pairing code is unavailable or expired.';
  end if;

  if exists (
    select 1
    from public.family_call_members as member
    where member.user_id = actor_id
      and member.revoked_at is null
  ) then
    raise exception using
      errcode = '42501',
      message = 'This child device is already paired.';
  end if;

  select left(
    coalesce(
      nullif(btrim(family.state -> 'children' -> pairing_record.child_profile_id ->> 'name'), ''),
      'Child'
    ),
    80
  )
  into child_name
  from public.family_state as family
  where family.owner_id = pairing_record.family_owner_id
    and jsonb_typeof(family.state -> 'children') = 'object'
    and (family.state -> 'children') ? pairing_record.child_profile_id;

  if child_name is null then
    raise exception using
      errcode = 'P0001',
      message = 'The pairing code is unavailable or expired.';
  end if;

  -- Pairing a new anonymous identity replaces the previous device for this
  -- child profile. Lock the family row so two concurrent claims cannot both
  -- attempt to become the one active device.
  perform 1
  from public.family_state as family
  where family.owner_id = pairing_record.family_owner_id
  for update;

  update public.family_call_members as prior_device
  set revoked_at = statement_timestamp()
  where prior_device.family_owner_id = pairing_record.family_owner_id
    and prior_device.child_profile_id = pairing_record.child_profile_id
    and prior_device.role = 'child'
    and prior_device.user_id <> actor_id
    and prior_device.revoked_at is null;

  update public.family_calls as prior_call
  set
    status = case
      when prior_call.status = 'ringing' then 'cancelled'
      else 'ended'
    end,
    ended_at = statement_timestamp(),
    expires_at = greatest(
      statement_timestamp(),
      prior_call.created_at + interval '1 microsecond'
    )
  where prior_call.family_owner_id = pairing_record.family_owner_id
    and prior_call.child_profile_id = pairing_record.child_profile_id
    and prior_call.status in ('ringing', 'active');

  select member.*
  into existing_member
  from public.family_call_members as member
  where member.user_id = actor_id
  for update;

  if found
     and existing_member.family_owner_id = pairing_record.family_owner_id
     and existing_member.role = 'child'
     and existing_member.child_profile_id = pairing_record.child_profile_id then
    update public.family_call_members
    set
      display_name = child_name,
      revoked_at = null,
      created_at = statement_timestamp()
    where user_id = actor_id;
  elsif found then
    -- An anonymous Auth identity is permanently bound to its first family.
    -- A newly created anonymous session must be used for a different pairing;
    -- this also preserves the foreign-key integrity of prior call metadata.
    raise exception using
      errcode = '42501',
      message = 'This child-device identity was paired previously.';
  else
    insert into public.family_call_members (
      user_id,
      family_owner_id,
      role,
      child_profile_id,
      display_name
    )
    values (
      actor_id,
      pairing_record.family_owner_id,
      'child',
      pairing_record.child_profile_id,
      child_name
    );
  end if;

  update public.family_call_pairings
  set
    claimed_at = statement_timestamp(),
    claimed_by = actor_id
  where id = pairing_record.id;

  return query
  select pairing_record.family_owner_id, pairing_record.child_profile_id;
end
$function$;

create or replace function kiddosprout_private.start_family_call(
  p_parent_user_id uuid default null
)
returns table (
  call_id uuid,
  call_status text,
  call_expires_at timestamptz,
  caller_user_id uuid,
  callee_user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  member_record public.family_call_members%rowtype;
  target_parent_id uuid;
  v_now timestamptz := statement_timestamp();
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception using
      errcode = '42501',
      message = 'A paired child device is required to start a family call.';
  end if;

  select member.*
  into member_record
  from public.family_call_members as member
  where member.user_id = actor_id
    and member.role = 'child'
    and member.revoked_at is null;

  if not found
     or not exists (
       select 1
       from public.family_state as family
       where family.owner_id = member_record.family_owner_id
         and jsonb_typeof(family.state -> 'children') = 'object'
         and (family.state -> 'children') ? member_record.child_profile_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'This child device is not paired with an active profile.';
  end if;

  target_parent_id := coalesce(p_parent_user_id, member_record.family_owner_id);
  if not exists (
    select 1
    from public.family_call_members as parent_member
    join auth.users as parent_account on parent_account.id = parent_member.user_id
    where parent_member.user_id = target_parent_id
      and parent_member.family_owner_id = member_record.family_owner_id
      and parent_member.role = 'parent'
      and parent_member.revoked_at is null
      and coalesce(parent_account.is_anonymous, false) = false
  ) then
    raise exception using
      errcode = '42501',
      message = 'That parent is not available for family calls.';
  end if;

  update public.family_calls as expired_call
  set
    status = case
      when expired_call.status = 'ringing' then 'missed'
      else 'ended'
    end,
    ended_at = v_now,
    expires_at = greatest(v_now, expired_call.created_at + interval '1 microsecond')
  where expired_call.status in ('ringing', 'active')
    and (
      expired_call.caller_user_id = actor_id
      or expired_call.callee_user_id = target_parent_id
    )
    and expired_call.expires_at <= v_now;

  if exists (
    select 1
    from public.family_calls as live_call
    where live_call.caller_user_id = actor_id
      and live_call.status in ('ringing', 'active')
      and live_call.expires_at > v_now
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'This child device already has a family call in progress.';
  end if;

  if (
    select count(*)
    from public.family_calls as recent_call
    where recent_call.caller_user_id = actor_id
      and recent_call.created_at > v_now - interval '1 minute'
  ) >= 3 then
    raise exception using
      errcode = 'P0001',
      message = 'Please wait before starting another family call.';
  end if;

  return query
  insert into public.family_calls (
    family_owner_id,
    child_profile_id,
    caller_user_id,
    callee_user_id,
    status,
    created_at,
    expires_at
  )
  values (
    member_record.family_owner_id,
    member_record.child_profile_id,
    actor_id,
    target_parent_id,
    'ringing',
    v_now,
    v_now + interval '90 seconds'
  )
  returning
    family_calls.id,
    family_calls.status,
    family_calls.expires_at,
    family_calls.caller_user_id,
    family_calls.callee_user_id;
end
$function$;

create or replace function kiddosprout_private.transition_family_call(
  p_call_id uuid,
  p_action text
)
returns table (
  call_id uuid,
  call_status text,
  call_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  v_now timestamptz := statement_timestamp();
begin
  if actor_id is null
     or p_call_id is null
     or p_action not in ('accept', 'decline', 'cancel', 'end') then
    raise exception using
      errcode = '22023',
      message = 'The family call action is not valid.';
  end if;

  update public.family_calls as expired_call
  set
    status = case
      when expired_call.status = 'ringing' then 'missed'
      else 'ended'
    end,
    ended_at = v_now,
    expires_at = greatest(v_now, expired_call.created_at + interval '1 microsecond')
  where expired_call.id = p_call_id
    and expired_call.status in ('ringing', 'active')
    and expired_call.expires_at <= v_now
    and actor_id in (expired_call.caller_user_id, expired_call.callee_user_id)
    and exists (
      select 1
      from public.family_call_members as member
      where member.user_id = actor_id
        and member.family_owner_id = expired_call.family_owner_id
        and member.revoked_at is null
    )
  returning expired_call.id, expired_call.status, expired_call.expires_at
  into call_id, call_status, call_expires_at;

  if found then
    return next;
    return;
  end if;

  if p_action = 'accept' then
    return query
    update public.family_calls as family_call
    set
      status = 'active',
      answered_at = v_now,
      expires_at = v_now + interval '1 hour'
    where family_call.id = p_call_id
      and family_call.callee_user_id = actor_id
      and family_call.status = 'ringing'
      and family_call.expires_at > v_now
      and exists (
        select 1
        from public.family_call_members as member
        where member.user_id = actor_id
          and member.family_owner_id = family_call.family_owner_id
          and member.role = 'parent'
          and member.revoked_at is null
      )
    returning family_call.id, family_call.status, family_call.expires_at;
  elsif p_action = 'decline' then
    return query
    update public.family_calls as family_call
    set
      status = 'declined',
      ended_at = v_now,
      expires_at = greatest(v_now, family_call.created_at + interval '1 microsecond')
    where family_call.id = p_call_id
      and family_call.callee_user_id = actor_id
      and family_call.status = 'ringing'
      and exists (
        select 1
        from public.family_call_members as member
        where member.user_id = actor_id
          and member.family_owner_id = family_call.family_owner_id
          and member.role = 'parent'
          and member.revoked_at is null
      )
    returning family_call.id, family_call.status, family_call.expires_at;
  elsif p_action = 'cancel' then
    return query
    update public.family_calls as family_call
    set
      status = 'cancelled',
      ended_at = v_now,
      expires_at = greatest(v_now, family_call.created_at + interval '1 microsecond')
    where family_call.id = p_call_id
      and family_call.caller_user_id = actor_id
      and family_call.status = 'ringing'
      and exists (
        select 1
        from public.family_call_members as member
        where member.user_id = actor_id
          and member.family_owner_id = family_call.family_owner_id
          and member.role = 'child'
          and member.revoked_at is null
      )
    returning family_call.id, family_call.status, family_call.expires_at;
  else
    return query
    update public.family_calls as family_call
    set
      status = 'ended',
      ended_at = v_now,
      expires_at = greatest(v_now, family_call.created_at + interval '1 microsecond')
    where family_call.id = p_call_id
      and actor_id in (family_call.caller_user_id, family_call.callee_user_id)
      and family_call.status = 'active'
      and exists (
        select 1
        from public.family_call_members as member
        where member.user_id = actor_id
          and member.family_owner_id = family_call.family_owner_id
          and member.revoked_at is null
      )
    returning family_call.id, family_call.status, family_call.expires_at;
  end if;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'The family call cannot perform that action.';
  end if;
end
$function$;

create or replace function kiddosprout_private.get_child_call_device(
  p_child_profile_id text
)
returns table (
  child_user_id uuid,
  paired_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_child_profile_id is null
     or p_child_profile_id !~ '^[a-z0-9][a-z0-9_-]{0,159}$' then
    raise exception using
      errcode = '42501',
      message = 'A verified parent account is required to view child devices.';
  end if;

  return query
  select child_member.user_id, child_member.created_at
  from public.family_call_members as parent_member
  join public.family_call_members as child_member
    on child_member.family_owner_id = parent_member.family_owner_id
   and child_member.role = 'child'
   and child_member.child_profile_id = p_child_profile_id
   and child_member.revoked_at is null
  where parent_member.user_id = actor_id
    and parent_member.role = 'parent'
    and parent_member.revoked_at is null
  order by child_member.created_at desc
  limit 1;
end
$function$;

create or replace function kiddosprout_private.revoke_child_call_device(
  p_child_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  v_family_owner_id uuid;
  child_profile text;
  v_now timestamptz := statement_timestamp();
begin
  if actor_id is null
     or p_child_user_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A verified parent account is required to revoke a child device.';
  end if;

  select parent_member.family_owner_id
  into v_family_owner_id
  from public.family_call_members as parent_member
  where parent_member.user_id = actor_id
    and parent_member.role = 'parent'
    and parent_member.revoked_at is null;

  if v_family_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'A verified parent account is required to revoke a child device.';
  end if;

  update public.family_call_members as child_member
  set revoked_at = v_now
  where child_member.user_id = p_child_user_id
    and child_member.family_owner_id = v_family_owner_id
    and child_member.role = 'child'
    and child_member.revoked_at is null
  returning child_member.child_profile_id into child_profile;

  if child_profile is null then
    raise exception using
      errcode = '42501',
      message = 'That child device is not active in this family.';
  end if;

  update public.family_calls as family_call
  set
    status = case
      when family_call.status = 'ringing' then 'cancelled'
      else 'ended'
    end,
    ended_at = v_now,
    expires_at = greatest(v_now, family_call.created_at + interval '1 microsecond')
  where family_call.family_owner_id = v_family_owner_id
    and family_call.caller_user_id = p_child_user_id
    and family_call.status in ('ringing', 'active');

  delete from public.family_call_pairings as pairing
  where pairing.family_owner_id = v_family_owner_id
    and pairing.child_profile_id = child_profile
    and pairing.claimed_at is null;

  return true;
end
$function$;

revoke all on function kiddosprout_private.create_family_call_pairing(text)
  from public, anon, authenticated, service_role;
revoke all on function kiddosprout_private.claim_family_call_pairing(text)
  from public, anon, authenticated, service_role;
revoke all on function kiddosprout_private.start_family_call(uuid)
  from public, anon, authenticated, service_role;
revoke all on function kiddosprout_private.transition_family_call(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function kiddosprout_private.get_child_call_device(text)
  from public, anon, authenticated, service_role;
revoke all on function kiddosprout_private.revoke_child_call_device(uuid)
  from public, anon, authenticated, service_role;

grant execute on function kiddosprout_private.create_family_call_pairing(text)
  to authenticated, service_role;
grant execute on function kiddosprout_private.claim_family_call_pairing(text)
  to authenticated, service_role;
grant execute on function kiddosprout_private.start_family_call(uuid)
  to authenticated, service_role;
grant execute on function kiddosprout_private.transition_family_call(uuid, text)
  to authenticated, service_role;
grant execute on function kiddosprout_private.get_child_call_device(text)
  to authenticated, service_role;
grant execute on function kiddosprout_private.revoke_child_call_device(uuid)
  to authenticated, service_role;

-- Public RPC endpoints are SECURITY INVOKER wrappers. Privileged table access
-- remains inside the non-exposed private schema, whose implementations verify
-- auth.uid(), role, family membership, and allowed state transitions.
create or replace function public.create_family_call_pairing(
  p_child_profile_id text
)
returns table (
  pairing_token text,
  pairing_expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.create_family_call_pairing(p_child_profile_id)
$function$;

create or replace function public.claim_family_call_pairing(
  p_pairing_token text
)
returns table (
  family_owner_id uuid,
  child_profile_id text
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.claim_family_call_pairing(p_pairing_token)
$function$;

create or replace function public.start_family_call(
  p_parent_user_id uuid default null
)
returns table (
  call_id uuid,
  call_status text,
  call_expires_at timestamptz,
  caller_user_id uuid,
  callee_user_id uuid
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.start_family_call(p_parent_user_id)
$function$;

create or replace function public.accept_family_call(
  p_call_id uuid
)
returns table (
  call_id uuid,
  call_status text,
  call_expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.transition_family_call(p_call_id, 'accept')
$function$;

create or replace function public.decline_family_call(
  p_call_id uuid
)
returns table (
  call_id uuid,
  call_status text,
  call_expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.transition_family_call(p_call_id, 'decline')
$function$;

create or replace function public.cancel_family_call(
  p_call_id uuid
)
returns table (
  call_id uuid,
  call_status text,
  call_expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.transition_family_call(p_call_id, 'cancel')
$function$;

create or replace function public.end_family_call(
  p_call_id uuid
)
returns table (
  call_id uuid,
  call_status text,
  call_expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.transition_family_call(p_call_id, 'end')
$function$;

create or replace function public.get_child_call_device(
  p_child_profile_id text
)
returns table (
  child_user_id uuid,
  paired_at timestamptz
)
language sql
security invoker
set search_path = ''
as $function$
  select *
  from kiddosprout_private.get_child_call_device(p_child_profile_id)
$function$;

create or replace function public.revoke_child_call_device(
  p_child_user_id uuid
)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  select kiddosprout_private.revoke_child_call_device(p_child_user_id)
$function$;

revoke all on function public.create_family_call_pairing(text)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_family_call_pairing(text)
  from public, anon, authenticated, service_role;
revoke all on function public.start_family_call(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.accept_family_call(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.decline_family_call(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.cancel_family_call(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.end_family_call(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.get_child_call_device(text)
  from public, anon, authenticated, service_role;
revoke all on function public.revoke_child_call_device(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.create_family_call_pairing(text)
  to authenticated, service_role;
grant execute on function public.claim_family_call_pairing(text)
  to authenticated, service_role;
grant execute on function public.start_family_call(uuid)
  to authenticated, service_role;
grant execute on function public.accept_family_call(uuid)
  to authenticated, service_role;
grant execute on function public.decline_family_call(uuid)
  to authenticated, service_role;
grant execute on function public.cancel_family_call(uuid)
  to authenticated, service_role;
grant execute on function public.end_family_call(uuid)
  to authenticated, service_role;
grant execute on function public.get_child_call_device(text)
  to authenticated, service_role;
grant execute on function public.revoke_child_call_device(uuid)
  to authenticated, service_role;

create or replace function kiddosprout_private.broadcast_family_call_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform realtime.broadcast_changes(
    'family-rings:' || coalesce(new.family_owner_id, old.family_owner_id)::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

  perform realtime.broadcast_changes(
    'family-call:' || coalesce(new.id, old.id)::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

  return null;
end
$function$;

revoke all on function kiddosprout_private.broadcast_family_call_change()
  from public, anon, authenticated, service_role;

drop trigger if exists family_calls_broadcast_change on public.family_calls;
create trigger family_calls_broadcast_change
  after insert or update on public.family_calls
  for each row
  execute function kiddosprout_private.broadcast_family_call_change();

-- Current Supabase permits policies on realtime.messages even though all other
-- realtime schema mutations are locked down. The hosted project must also
-- disable Realtime's "Allow public access" setting, and every client channel
-- must set config.private=true.
drop policy if exists family_call_parent_receive_rings on realtime.messages;
create policy family_call_parent_receive_rings
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and exists (
      select 1
      from public.family_call_members as member
      where member.user_id = (select auth.uid())
        and member.role = 'parent'
        and member.revoked_at is null
        and (select realtime.topic()) = 'family-rings:' || member.family_owner_id::text
    )
  );

drop policy if exists family_call_participant_receive_signals on realtime.messages;
create policy family_call_participant_receive_signals
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1
      from public.family_calls as family_call
      join public.family_call_members as member
        on member.family_owner_id = family_call.family_owner_id
       and member.user_id = (select auth.uid())
      where (select auth.uid()) in (
          family_call.caller_user_id,
          family_call.callee_user_id
        )
        and member.revoked_at is null
        and (
          (
            family_call.status in ('ringing', 'active')
            and family_call.expires_at > statement_timestamp()
          )
          or (
            family_call.status in ('declined', 'cancelled', 'ended', 'missed')
            and family_call.ended_at > statement_timestamp() - interval '30 seconds'
          )
        )
        and (select realtime.topic()) = 'family-call:' || family_call.id::text
    )
  );

drop policy if exists family_call_participant_send_signals on realtime.messages;
create policy family_call_participant_send_signals
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.event in (
      'ready',
      'offer',
      'answer',
      'child-ice',
      'parent-ice',
      'hangup'
    )
    and exists (
      select 1
      from public.family_calls as family_call
      join public.family_call_members as member
        on member.family_owner_id = family_call.family_owner_id
       and member.user_id = (select auth.uid())
      where (select auth.uid()) in (
          family_call.caller_user_id,
          family_call.callee_user_id
        )
        and member.revoked_at is null
        and family_call.status in ('ringing', 'active')
        and family_call.expires_at > statement_timestamp()
        and (select realtime.topic()) = 'family-call:' || family_call.id::text
    )
  );

notify pgrst, 'reload schema';
