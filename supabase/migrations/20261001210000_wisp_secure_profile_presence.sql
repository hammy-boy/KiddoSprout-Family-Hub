-- Keep Wisp presence and profile privacy decisions on the server. Browser
-- clients receive only public profile columns directly; private preferences
-- and presence are exposed through guarded RPCs.

create or replace function wisp_private.get_own_profile()
returns table (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  status text,
  last_seen timestamptz,
  show_online_status boolean,
  show_read_receipts boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    profile.id,
    profile.username,
    profile.bio,
    profile.avatar_url,
    profile.status,
    profile.last_seen,
    profile.show_online_status,
    profile.show_read_receipts
  from public.wisp_profiles as profile
  where wisp_private.is_permanent_actor()
    and profile.id = (select auth.uid());
$function$;

create or replace function wisp_private.get_visible_profiles(
  p_profile_ids uuid[]
)
returns table (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  status text,
  last_seen timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not wisp_private.is_permanent_actor() then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;

  if p_profile_ids is null or cardinality(p_profile_ids) = 0 then
    return;
  end if;
  if cardinality(p_profile_ids) > 200 then
    raise exception using
      errcode = '22023',
      message = 'At most 200 profiles can be requested.';
  end if;

  return query
  select
    profile.id,
    profile.username,
    profile.bio,
    profile.avatar_url,
    case
      when profile.show_online_status
       and profile.status = 'online'
       and profile.last_seen >= statement_timestamp() - interval '90 seconds'
      then 'online'::text
      else null::text
    end as status,
    case
      when profile.show_online_status
       and profile.status = 'online'
       and profile.last_seen >= statement_timestamp() - interval '90 seconds'
      then profile.last_seen
      else null::timestamptz
    end as last_seen
  from public.wisp_profiles as profile
  where profile.id = any(p_profile_ids)
    and wisp_private.can_view_profile(profile.id);
end
$function$;

create or replace function wisp_private.set_presence(
  p_status text
)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  changed_at timestamptz := statement_timestamp();
begin
  if not wisp_private.is_permanent_actor() then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;
  if p_status is null or p_status not in ('online', 'offline') then
    raise exception using
      errcode = '22023',
      message = 'Presence must be online or offline.';
  end if;

  update public.wisp_profiles as profile
  set status = p_status,
      last_seen = changed_at
  where profile.id = actor_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Complete the Wisp profile before setting presence.';
  end if;
  return changed_at;
end
$function$;

create or replace function wisp_private.set_presence(
  p_status text,
  p_expected_user_id uuid
)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if p_expected_user_id is null or p_expected_user_id is distinct from auth.uid() then
    raise exception using
      errcode = '42501',
      message = 'The restored page no longer belongs to the signed-in account.';
  end if;
  return wisp_private.set_presence(p_status);
end
$function$;

create or replace function wisp_private.update_own_profile(
  p_changes jsonb
)
returns table (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  status text,
  last_seen timestamptz,
  show_online_status boolean,
  show_read_receipts boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  next_username text;
  next_bio text;
begin
  if not wisp_private.is_permanent_actor() then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;
  if p_changes is null
     or jsonb_typeof(p_changes) <> 'object'
     or p_changes = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Choose at least one profile field to update.';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(p_changes) as requested(key)
    where requested.key not in (
      'username', 'bio', 'show_online_status', 'show_read_receipts'
    )
  ) then
    raise exception using errcode = '22023', message = 'A requested profile field cannot be updated.';
  end if;

  if p_changes ? 'username' then
    if jsonb_typeof(p_changes -> 'username') <> 'string' then
      raise exception using errcode = '22023', message = 'Username must be text.';
    end if;
    next_username := btrim(p_changes ->> 'username');
    if char_length(next_username) not between 3 and 32
       or next_username !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$' then
      raise exception using errcode = '22023', message = 'Username format is invalid.';
    end if;
  end if;

  if p_changes ? 'bio' then
    if jsonb_typeof(p_changes -> 'bio') not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'Bio must be text.';
    end if;
    next_bio := nullif(btrim(coalesce(p_changes ->> 'bio', '')), '');
    if char_length(coalesce(next_bio, '')) > 280 then
      raise exception using errcode = '22023', message = 'Bio must be 280 characters or fewer.';
    end if;
  end if;

  if p_changes ? 'show_online_status'
     and jsonb_typeof(p_changes -> 'show_online_status') <> 'boolean' then
    raise exception using errcode = '22023', message = 'Online-status privacy must be true or false.';
  end if;
  if p_changes ? 'show_read_receipts'
     and jsonb_typeof(p_changes -> 'show_read_receipts') <> 'boolean' then
    raise exception using errcode = '22023', message = 'Read-receipt privacy must be true or false.';
  end if;

  update public.wisp_profiles as profile
  set
    username = case when p_changes ? 'username' then next_username else profile.username end,
    bio = case when p_changes ? 'bio' then next_bio else profile.bio end,
    show_online_status = case
      when p_changes ? 'show_online_status'
      then (p_changes ->> 'show_online_status')::boolean
      else profile.show_online_status
    end,
    show_read_receipts = case
      when p_changes ? 'show_read_receipts'
      then (p_changes ->> 'show_read_receipts')::boolean
      else profile.show_read_receipts
    end
  where profile.id = actor_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Complete the Wisp profile before updating it.';
  end if;

  return query
  select
    profile.id,
    profile.username,
    profile.bio,
    profile.avatar_url,
    profile.status,
    profile.last_seen,
    profile.show_online_status,
    profile.show_read_receipts
  from public.wisp_profiles as profile
  where profile.id = actor_id;
end
$function$;

revoke all on function wisp_private.get_own_profile()
  from public, anon, authenticated;
revoke all on function wisp_private.get_visible_profiles(uuid[])
  from public, anon, authenticated;
revoke all on function wisp_private.set_presence(text)
  from public, anon, authenticated;
revoke all on function wisp_private.set_presence(text, uuid)
  from public, anon, authenticated;
revoke all on function wisp_private.update_own_profile(jsonb)
  from public, anon, authenticated;

grant execute on function wisp_private.get_own_profile()
  to authenticated, service_role;
grant execute on function wisp_private.get_visible_profiles(uuid[])
  to authenticated, service_role;
grant execute on function wisp_private.set_presence(text)
  to authenticated, service_role;
grant execute on function wisp_private.set_presence(text, uuid)
  to authenticated, service_role;
grant execute on function wisp_private.update_own_profile(jsonb)
  to authenticated, service_role;

create or replace function public.wisp_get_own_profile()
returns table (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  status text,
  last_seen timestamptz,
  show_online_status boolean,
  show_read_receipts boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select * from wisp_private.get_own_profile();
$function$;

create or replace function public.wisp_get_visible_profiles(
  p_profile_ids uuid[]
)
returns table (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  status text,
  last_seen timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select * from wisp_private.get_visible_profiles(p_profile_ids);
$function$;

create or replace function public.wisp_set_presence(
  p_status text
)
returns timestamptz
language sql
volatile
security invoker
set search_path = ''
as $function$
  select wisp_private.set_presence(p_status);
$function$;

create or replace function public.wisp_set_presence(
  p_status text,
  p_expected_user_id uuid
)
returns timestamptz
language sql
volatile
security invoker
set search_path = ''
as $function$
  select wisp_private.set_presence(p_status, p_expected_user_id);
$function$;

create or replace function public.wisp_update_own_profile(
  p_changes jsonb
)
returns table (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  status text,
  last_seen timestamptz,
  show_online_status boolean,
  show_read_receipts boolean
)
language sql
volatile
security invoker
set search_path = ''
as $function$
  select * from wisp_private.update_own_profile(p_changes);
$function$;

revoke all on function public.wisp_get_own_profile()
  from public, anon, authenticated;
revoke all on function public.wisp_get_visible_profiles(uuid[])
  from public, anon, authenticated;
revoke all on function public.wisp_set_presence(text)
  from public, anon, authenticated;
revoke all on function public.wisp_set_presence(text, uuid)
  from public, anon, authenticated;
revoke all on function public.wisp_update_own_profile(jsonb)
  from public, anon, authenticated;

grant execute on function public.wisp_get_own_profile()
  to authenticated;
grant execute on function public.wisp_get_visible_profiles(uuid[])
  to authenticated;
grant execute on function public.wisp_set_presence(text)
  to authenticated;
grant execute on function public.wisp_set_presence(text, uuid)
  to authenticated;
grant execute on function public.wisp_update_own_profile(jsonb)
  to authenticated;

-- Whole-row SELECT exposed status and privacy preferences even when the UI
-- hid them. Limit direct reads to genuinely public fields; RLS still decides
-- which profile rows are visible.
revoke select on table public.wisp_profiles
  from public, anon, authenticated;
revoke select (
  status,
  last_seen,
  show_online_status,
  show_read_receipts
) on table public.wisp_profiles from public, anon, authenticated;
grant select (
  id,
  username,
  bio,
  avatar_url,
  created_at
) on table public.wisp_profiles to authenticated;

-- Rebuild browser UPDATE privileges from an allowlist so an old table-level
-- grant or a future drifted column grant cannot bypass presence safeguards.
revoke update on table public.wisp_profiles
  from public, anon, authenticated;
revoke update (
  id,
  username,
  bio,
  avatar_url,
  status,
  show_online_status,
  show_read_receipts,
  last_seen,
  created_at
) on table public.wisp_profiles from public, anon, authenticated;
grant update (
  username,
  bio,
  avatar_url,
  show_online_status,
  show_read_receipts
) on table public.wisp_profiles to authenticated;

comment on function public.wisp_get_own_profile() is
  'Returns the current permanent user''s Wisp profile and private preferences.';
comment on function public.wisp_get_visible_profiles(uuid[]) is
  'Returns up to 200 visible profiles with server-redacted, freshness-limited presence.';
comment on function public.wisp_set_presence(text) is
  'Sets the current permanent user''s presence using a server timestamp.';
comment on function public.wisp_set_presence(text, uuid) is
  'Sets presence only when a restored page still belongs to the expected permanent user.';
comment on function public.wisp_update_own_profile(jsonb) is
  'Atomically validates, updates, and returns the current permanent user''s allowlisted Wisp profile fields.';

notify pgrst, 'reload schema';
