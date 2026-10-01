-- Wisp shares KiddoSprout's Supabase project but keeps every database object
-- namespaced. Browser clients receive only the public publishable key; all
-- authorization remains in Postgres through grants, RLS, and narrow RPCs.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists wisp_private;
revoke all on schema wisp_private from public, anon, authenticated;
grant usage on schema wisp_private to authenticated, service_role;

create table if not exists public.wisp_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  bio text,
  avatar_url text,
  status text not null default 'offline',
  show_online_status boolean not null default true,
  show_read_receipts boolean not null default true,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  constraint wisp_profiles_username_shape check (
    username = btrim(username)
    and char_length(username) between 3 and 32
    and username ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$'
  ),
  constraint wisp_profiles_bio_length check (
    bio is null or char_length(bio) <= 280
  ),
  constraint wisp_profiles_avatar_url check (
    avatar_url is null
    or (
      char_length(avatar_url) between 1 and 2048
      and avatar_url ~ '^https://'
    )
  ),
  constraint wisp_profiles_status check (status in ('online', 'offline'))
);

comment on table public.wisp_profiles is
  'PII-minimized Wisp profile. Email and phone remain in Supabase Auth and are never copied here.';

create unique index if not exists wisp_profiles_username_lower_key
  on public.wisp_profiles (lower(username));
create index if not exists wisp_profiles_username_search_idx
  on public.wisp_profiles (lower(username) text_pattern_ops);

create table if not exists public.wisp_contacts (
  owner_id uuid not null references public.wisp_profiles (id) on delete cascade,
  contact_id uuid not null references public.wisp_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  constraint wisp_contacts_not_self check (owner_id <> contact_id)
);

create index if not exists wisp_contacts_contact_owner_idx
  on public.wisp_contacts (contact_id, owner_id);

create table if not exists public.wisp_blocks (
  owner_id uuid not null references public.wisp_profiles (id) on delete cascade,
  blocked_id uuid not null references public.wisp_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, blocked_id),
  constraint wisp_blocks_not_self check (owner_id <> blocked_id)
);

create index if not exists wisp_blocks_blocked_owner_idx
  on public.wisp_blocks (blocked_id, owner_id);

create table if not exists public.wisp_chats (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  created_by uuid not null references public.wisp_profiles (id) on delete cascade,
  direct_user_low uuid not null references public.wisp_profiles (id) on delete cascade,
  direct_user_high uuid not null references public.wisp_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wisp_chats_direct_only check (is_group = false),
  constraint wisp_chats_direct_order check (direct_user_low < direct_user_high),
  constraint wisp_chats_creator_is_member check (
    created_by in (direct_user_low, direct_user_high)
  ),
  constraint wisp_chats_direct_pair_key unique (direct_user_low, direct_user_high)
);

create index if not exists wisp_chats_created_by_recent_idx
  on public.wisp_chats (created_by, created_at desc);
create index if not exists wisp_chats_direct_user_high_idx
  on public.wisp_chats (direct_user_high);

create table if not exists public.wisp_chat_members (
  chat_id uuid not null references public.wisp_chats (id) on delete cascade,
  user_id uuid not null references public.wisp_profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id),
  constraint wisp_chat_members_role check (role in ('member', 'admin'))
);

create index if not exists wisp_chat_members_user_recent_idx
  on public.wisp_chat_members (user_id, joined_at desc, chat_id);

create table if not exists public.wisp_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.wisp_chats (id) on delete cascade,
  sender_id uuid not null,
  content text,
  media_url text,
  media_type text,
  reply_to_id uuid,
  edited_at timestamptz,
  deleted_at timestamptz,
  disappears_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wisp_messages_sender_member
    foreign key (chat_id, sender_id)
    references public.wisp_chat_members (chat_id, user_id)
    on delete cascade,
  constraint wisp_messages_id_chat_key unique (id, chat_id),
  constraint wisp_messages_reply_same_chat
    foreign key (reply_to_id, chat_id)
    references public.wisp_messages (id, chat_id)
    on delete set null (reply_to_id),
  constraint wisp_messages_content_length check (
    content is null or char_length(content) <= 4000
  ),
  constraint wisp_messages_media_type check (
    media_type is null or media_type in ('image', 'video', 'audio', 'document')
  ),
  constraint wisp_messages_media_shape check (
    (media_url is null and media_type is null)
    or (
      media_url is not null
      and media_type is not null
      and char_length(media_url) between 1 and 2048
      and media_url ~ '^https://'
    )
  ),
  constraint wisp_messages_has_body check (
    deleted_at is not null
    or nullif(btrim(content), '') is not null
    or media_url is not null
  ),
  constraint wisp_messages_timestamps check (
    (edited_at is null or edited_at >= created_at)
    and (deleted_at is null or deleted_at >= created_at)
    and (disappears_at is null or disappears_at > created_at)
  )
);

create index if not exists wisp_messages_chat_timeline_idx
  on public.wisp_messages (chat_id, created_at, id);
create index if not exists wisp_messages_chat_sender_idx
  on public.wisp_messages (chat_id, sender_id);
create index if not exists wisp_messages_reply_idx
  on public.wisp_messages (reply_to_id, chat_id)
  where reply_to_id is not null;
create index if not exists wisp_messages_expiry_idx
  on public.wisp_messages (disappears_at)
  where disappears_at is not null;

create table if not exists public.wisp_message_receipts (
  message_id uuid not null references public.wisp_messages (id) on delete cascade,
  user_id uuid not null references public.wisp_profiles (id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id),
  constraint wisp_message_receipts_order check (
    read_at is null
    or (delivered_at is not null and read_at >= delivered_at)
  )
);

create index if not exists wisp_message_receipts_user_idx
  on public.wisp_message_receipts (user_id, message_id);

create table if not exists public.wisp_calls (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.wisp_chats (id) on delete cascade,
  initiated_by uuid not null,
  call_type text not null,
  status text not null default 'ringing',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint wisp_calls_initiator_member
    foreign key (chat_id, initiated_by)
    references public.wisp_chat_members (chat_id, user_id)
    on delete cascade,
  constraint wisp_calls_id_chat_key unique (id, chat_id),
  constraint wisp_calls_type check (call_type in ('voice', 'video')),
  constraint wisp_calls_status check (
    status in ('ringing', 'active', 'ended', 'missed')
  ),
  constraint wisp_calls_status_shape check (
    (status in ('ringing', 'active') and ended_at is null)
    or (status in ('ended', 'missed') and ended_at is not null)
  ),
  constraint wisp_calls_ended_after_start check (
    ended_at is null or ended_at >= started_at
  )
);

create index if not exists wisp_calls_chat_recent_idx
  on public.wisp_calls (chat_id, started_at desc);
create index if not exists wisp_calls_initiator_recent_idx
  on public.wisp_calls (initiated_by, started_at desc);
create unique index if not exists wisp_calls_one_live_chat_idx
  on public.wisp_calls (chat_id)
  where status in ('ringing', 'active');

create table if not exists public.wisp_call_participants (
  call_id uuid not null,
  chat_id uuid not null,
  user_id uuid not null,
  joined_at timestamptz,
  left_at timestamptz,
  primary key (call_id, user_id),
  constraint wisp_call_participants_call_chat
    foreign key (call_id, chat_id)
    references public.wisp_calls (id, chat_id)
    on delete cascade,
  constraint wisp_call_participants_chat_member
    foreign key (chat_id, user_id)
    references public.wisp_chat_members (chat_id, user_id)
    on delete cascade,
  constraint wisp_call_participants_timestamps check (
    left_at is null
    or (joined_at is not null and left_at >= joined_at)
  )
);

create index if not exists wisp_call_participants_user_recent_idx
  on public.wisp_call_participants (user_id, call_id);
create index if not exists wisp_call_participants_chat_user_idx
  on public.wisp_call_participants (chat_id, user_id);

alter table public.wisp_profiles enable row level security;
alter table public.wisp_contacts enable row level security;
alter table public.wisp_blocks enable row level security;
alter table public.wisp_chats enable row level security;
alter table public.wisp_chat_members enable row level security;
alter table public.wisp_messages enable row level security;
alter table public.wisp_message_receipts enable row level security;
alter table public.wisp_calls enable row level security;
alter table public.wisp_call_participants enable row level security;

-- These helpers bypass table RLS only to make policy membership checks
-- non-recursive. Each helper derives the actor from the verified JWT and
-- rejects Supabase anonymous Auth users explicitly.
create or replace function wisp_private.is_permanent_actor()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true';
$function$;

create or replace function wisp_private.can_view_profile(
  p_profile_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_profile_id is null then
    return false;
  end if;

  return actor_id = p_profile_id
    or not exists (
      select 1
      from public.wisp_blocks as block
      where (block.owner_id = actor_id and block.blocked_id = p_profile_id)
         or (block.owner_id = p_profile_id and block.blocked_id = actor_id)
    );
end
$function$;

create or replace function wisp_private.is_chat_member(
  p_chat_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_chat_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.wisp_chat_members as member
    where member.chat_id = p_chat_id
      and member.user_id = actor_id
  );
end
$function$;

create or replace function wisp_private.can_interact_in_chat(
  p_chat_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_chat_id is null
     or not exists (
       select 1
       from public.wisp_chat_members as own_membership
       where own_membership.chat_id = p_chat_id
         and own_membership.user_id = actor_id
     ) then
    return false;
  end if;

  return not exists (
    select 1
    from public.wisp_chat_members as other_member
    join public.wisp_blocks as block
      on (
        block.owner_id = actor_id
        and block.blocked_id = other_member.user_id
      )
      or (
        block.owner_id = other_member.user_id
        and block.blocked_id = actor_id
      )
    where other_member.chat_id = p_chat_id
      and other_member.user_id <> actor_id
  );
end
$function$;

create or replace function wisp_private.can_signal_topic(
  p_topic text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  chat_id uuid;
begin
  if auth.uid() is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or p_topic is null
     or p_topic !~* '^wisp-call:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  chat_id := substr(p_topic, 11)::uuid;
  return wisp_private.can_interact_in_chat(chat_id);
end
$function$;

revoke all on function wisp_private.is_permanent_actor()
  from public, anon, authenticated;
revoke all on function wisp_private.can_view_profile(uuid)
  from public, anon, authenticated;
revoke all on function wisp_private.is_chat_member(uuid)
  from public, anon, authenticated;
revoke all on function wisp_private.can_interact_in_chat(uuid)
  from public, anon, authenticated;
revoke all on function wisp_private.can_signal_topic(text)
  from public, anon, authenticated;

grant execute on function wisp_private.is_permanent_actor()
  to authenticated, service_role;
grant execute on function wisp_private.can_view_profile(uuid)
  to authenticated, service_role;
grant execute on function wisp_private.is_chat_member(uuid)
  to authenticated, service_role;
grant execute on function wisp_private.can_interact_in_chat(uuid)
  to authenticated, service_role;
grant execute on function wisp_private.can_signal_topic(text)
  to authenticated, service_role;

create policy wisp_profiles_select_visible
  on public.wisp_profiles
  for select
  to authenticated
  using (wisp_private.can_view_profile(wisp_profiles.id));

create policy wisp_profiles_update_own
  on public.wisp_profiles
  for update
  to authenticated
  using (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_profiles.id
  )
  with check (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_profiles.id
  );

create policy wisp_contacts_select_own
  on public.wisp_contacts
  for select
  to authenticated
  using (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_contacts.owner_id
  );

create policy wisp_contacts_insert_own
  on public.wisp_contacts
  for insert
  to authenticated
  with check (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_contacts.owner_id
    and wisp_private.can_view_profile(wisp_contacts.contact_id)
  );

create policy wisp_contacts_delete_own
  on public.wisp_contacts
  for delete
  to authenticated
  using (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_contacts.owner_id
  );

create policy wisp_blocks_select_own
  on public.wisp_blocks
  for select
  to authenticated
  using (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_blocks.owner_id
  );

create policy wisp_blocks_insert_own
  on public.wisp_blocks
  for insert
  to authenticated
  with check (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_blocks.owner_id
    and exists (
      select 1
      from public.wisp_profiles as target_profile
      where target_profile.id = wisp_blocks.blocked_id
    )
  );

create policy wisp_blocks_delete_own
  on public.wisp_blocks
  for delete
  to authenticated
  using (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_blocks.owner_id
  );

create policy wisp_chats_select_member
  on public.wisp_chats
  for select
  to authenticated
  using (wisp_private.is_chat_member(wisp_chats.id));

create policy wisp_chat_members_select_member
  on public.wisp_chat_members
  for select
  to authenticated
  using (wisp_private.is_chat_member(wisp_chat_members.chat_id));

create policy wisp_messages_select_member
  on public.wisp_messages
  for select
  to authenticated
  using (
    wisp_private.is_chat_member(wisp_messages.chat_id)
    and (
      wisp_messages.disappears_at is null
      or wisp_messages.disappears_at > statement_timestamp()
    )
  );

create policy wisp_messages_insert_sender
  on public.wisp_messages
  for insert
  to authenticated
  with check (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_messages.sender_id
    and wisp_private.can_interact_in_chat(wisp_messages.chat_id)
  );

create policy wisp_message_receipts_select_member
  on public.wisp_message_receipts
  for select
  to authenticated
  using (
    wisp_private.is_permanent_actor()
    and exists (
      select 1
      from public.wisp_messages as message
      where message.id = wisp_message_receipts.message_id
        and wisp_private.is_chat_member(message.chat_id)
    )
  );

create policy wisp_message_receipts_insert_own
  on public.wisp_message_receipts
  for insert
  to authenticated
  with check (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_message_receipts.user_id
    and exists (
      select 1
      from public.wisp_messages as message
      where message.id = wisp_message_receipts.message_id
        and wisp_private.is_chat_member(message.chat_id)
    )
  );

create policy wisp_message_receipts_update_own
  on public.wisp_message_receipts
  for update
  to authenticated
  using (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_message_receipts.user_id
  )
  with check (
    wisp_private.is_permanent_actor()
    and (select auth.uid()) = wisp_message_receipts.user_id
  );

create policy wisp_calls_select_member
  on public.wisp_calls
  for select
  to authenticated
  using (wisp_private.is_chat_member(wisp_calls.chat_id));

create policy wisp_call_participants_select_member
  on public.wisp_call_participants
  for select
  to authenticated
  using (wisp_private.is_chat_member(wisp_call_participants.chat_id));

-- Direct chat creation and call lifecycle writes are atomic RPCs. Browsers do
-- not receive INSERT/UPDATE privileges for those tables.
create or replace function wisp_private.enroll_profile(
  p_username text
)
returns setof public.wisp_profiles
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  clean_username text := btrim(p_username);
  profile_record public.wisp_profiles%rowtype;
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;

  if clean_username is null
     or char_length(clean_username) not between 3 and 32
     or clean_username !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$' then
    raise exception using
      errcode = '22023',
      message = 'Username must be 3-32 letters, numbers, dots, dashes, or underscores.';
  end if;

  insert into public.wisp_profiles (id, username)
  values (actor_id, clean_username)
  on conflict (id) do nothing;

  select profile.*
  into profile_record
  from public.wisp_profiles as profile
  where profile.id = actor_id;

  return next profile_record;
end
$function$;

create or replace function wisp_private.get_or_create_direct_chat(
  p_other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  low_user_id uuid;
  high_user_id uuid;
  chat_id uuid;
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;

  if p_other_user_id is null or p_other_user_id = actor_id then
    raise exception using
      errcode = '22023',
      message = 'Choose another enrolled Wisp profile.';
  end if;

  if not exists (
    select 1 from public.wisp_profiles as own_profile
    where own_profile.id = actor_id
  ) or not exists (
    select 1 from public.wisp_profiles as other_profile
    where other_profile.id = p_other_user_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'Both people must enroll a Wisp profile first.';
  end if;

  if exists (
    select 1
    from public.wisp_blocks as block
    where (block.owner_id = actor_id and block.blocked_id = p_other_user_id)
       or (block.owner_id = p_other_user_id and block.blocked_id = actor_id)
  ) then
    raise exception using
      errcode = '42501',
      message = 'A direct chat cannot be created for these profiles.';
  end if;

  low_user_id := least(actor_id, p_other_user_id);
  high_user_id := greatest(actor_id, p_other_user_id);

  insert into public.wisp_chats (
    created_by,
    direct_user_low,
    direct_user_high
  )
  values (actor_id, low_user_id, high_user_id)
  on conflict (direct_user_low, direct_user_high) do update
  set direct_user_low = excluded.direct_user_low
  returning id into chat_id;

  insert into public.wisp_chat_members (chat_id, user_id, role)
  values
    (chat_id, actor_id, 'admin'),
    (chat_id, p_other_user_id, 'member')
  on conflict (chat_id, user_id) do nothing;

  return chat_id;
end
$function$;

create or replace function wisp_private.start_call(
  p_chat_id uuid,
  p_call_type text
)
returns table (
  call_id uuid,
  call_started_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  new_call_id uuid;
  new_started_at timestamptz;
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
     or not wisp_private.can_interact_in_chat(p_chat_id) then
    raise exception using
      errcode = '42501',
      message = 'You cannot start a call in this chat.';
  end if;

  if p_call_type is null or p_call_type not in ('voice', 'video') then
    raise exception using
      errcode = '22023',
      message = 'Call type must be voice or video.';
  end if;

  update public.wisp_calls as stale_call
  set
    status = 'missed',
    ended_at = statement_timestamp()
  where stale_call.chat_id = p_chat_id
    and stale_call.status = 'ringing'
    and stale_call.started_at <= statement_timestamp() - interval '2 minutes';

  update public.wisp_calls as stale_call
  set
    status = 'ended',
    ended_at = statement_timestamp()
  where stale_call.chat_id = p_chat_id
    and stale_call.status = 'active'
    and stale_call.started_at <= statement_timestamp() - interval '8 hours';

  if exists (
    select 1
    from public.wisp_calls as live_call
    where live_call.chat_id = p_chat_id
      and live_call.status in ('ringing', 'active')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'This chat already has a call in progress.';
  end if;

  if (
    select count(*)
    from public.wisp_calls as recent_call
    where recent_call.initiated_by = actor_id
      and recent_call.started_at > statement_timestamp() - interval '1 minute'
  ) >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'Please wait before starting another call.';
  end if;

  insert into public.wisp_calls (
    chat_id,
    initiated_by,
    call_type
  )
  values (p_chat_id, actor_id, p_call_type)
  returning id, started_at into new_call_id, new_started_at;

  insert into public.wisp_call_participants (
    call_id,
    chat_id,
    user_id,
    joined_at
  )
  select
    new_call_id,
    p_chat_id,
    member.user_id,
    case when member.user_id = actor_id then new_started_at else null end
  from public.wisp_chat_members as member
  where member.chat_id = p_chat_id;

  return query select new_call_id, new_started_at;
end
$function$;

create or replace function wisp_private.join_call(
  p_call_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  call_record public.wisp_calls%rowtype;
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;

  select active_call.*
  into call_record
  from public.wisp_calls as active_call
  where active_call.id = p_call_id
  for update;

  if not found
     or call_record.ended_at is not null
     or call_record.status not in ('ringing', 'active')
     or not wisp_private.can_interact_in_chat(call_record.chat_id)
     or not exists (
       select 1
       from public.wisp_call_participants as participant
       where participant.call_id = p_call_id
         and participant.user_id = actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'This call is not available.';
  end if;

  if call_record.status = 'ringing'
     and call_record.started_at <= statement_timestamp() - interval '2 minutes' then
    update public.wisp_calls
    set status = 'missed', ended_at = statement_timestamp()
    where id = p_call_id;

    raise exception using
      errcode = 'P0001',
      message = 'This call has expired.';
  end if;

  update public.wisp_call_participants
  set joined_at = coalesce(joined_at, statement_timestamp())
  where call_id = p_call_id
    and user_id = actor_id;

  update public.wisp_calls
  set status = 'active'
  where id = p_call_id;

  return true;
end
$function$;

create or replace function wisp_private.end_call(
  p_call_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  call_record public.wisp_calls%rowtype;
begin
  if actor_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception using
      errcode = '42501',
      message = 'A permanent signed-in account is required.';
  end if;

  -- Ending is deliberately authorized by recorded participation, not by the
  -- current block/contact state. Either participant must still be able to
  -- release a live call after one person blocks the other. The same participant
  -- may safely repeat cleanup after an interrupted or page-closing request.
  select active_call.*
  into call_record
  from public.wisp_calls as active_call
  where active_call.id = p_call_id
    and exists (
      select 1
      from public.wisp_call_participants as participant
      where participant.call_id = active_call.id
        and participant.user_id = actor_id
    )
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'This call cannot be ended by the current account.';
  end if;

  update public.wisp_call_participants
  set left_at = statement_timestamp()
  where call_id = p_call_id
    and user_id = actor_id
    and joined_at is not null
    and left_at is null;

  update public.wisp_calls
  set status = 'ended', ended_at = statement_timestamp()
  where id = p_call_id
    and ended_at is null
    and status in ('ringing', 'active');

  return true;
end
$function$;

revoke all on function wisp_private.enroll_profile(text)
  from public, anon, authenticated;
revoke all on function wisp_private.get_or_create_direct_chat(uuid)
  from public, anon, authenticated;
revoke all on function wisp_private.start_call(uuid, text)
  from public, anon, authenticated;
revoke all on function wisp_private.join_call(uuid)
  from public, anon, authenticated;
revoke all on function wisp_private.end_call(uuid)
  from public, anon, authenticated;

grant execute on function wisp_private.enroll_profile(text)
  to authenticated, service_role;
grant execute on function wisp_private.get_or_create_direct_chat(uuid)
  to authenticated, service_role;
grant execute on function wisp_private.start_call(uuid, text)
  to authenticated, service_role;
grant execute on function wisp_private.join_call(uuid)
  to authenticated, service_role;
grant execute on function wisp_private.end_call(uuid)
  to authenticated, service_role;

create or replace function public.wisp_enroll_profile(
  p_username text
)
returns setof public.wisp_profiles
language sql
volatile
security invoker
set search_path = ''
as $function$
  select * from wisp_private.enroll_profile(p_username);
$function$;

create or replace function public.wisp_get_or_create_direct_chat(
  p_other_user_id uuid
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $function$
  select wisp_private.get_or_create_direct_chat(p_other_user_id);
$function$;

create or replace function public.wisp_start_call(
  p_chat_id uuid,
  p_call_type text
)
returns table (
  call_id uuid,
  call_started_at timestamptz
)
language sql
volatile
security invoker
set search_path = ''
as $function$
  select * from wisp_private.start_call(p_chat_id, p_call_type);
$function$;

create or replace function public.wisp_join_call(
  p_call_id uuid
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select wisp_private.join_call(p_call_id);
$function$;

create or replace function public.wisp_end_call(
  p_call_id uuid
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select wisp_private.end_call(p_call_id);
$function$;

revoke all on function public.wisp_enroll_profile(text)
  from public, anon, authenticated;
revoke all on function public.wisp_get_or_create_direct_chat(uuid)
  from public, anon, authenticated;
revoke all on function public.wisp_start_call(uuid, text)
  from public, anon, authenticated;
revoke all on function public.wisp_join_call(uuid)
  from public, anon, authenticated;
revoke all on function public.wisp_end_call(uuid)
  from public, anon, authenticated;

grant execute on function public.wisp_enroll_profile(text)
  to authenticated;
grant execute on function public.wisp_get_or_create_direct_chat(uuid)
  to authenticated;
grant execute on function public.wisp_start_call(uuid, text)
  to authenticated;
grant execute on function public.wisp_join_call(uuid)
  to authenticated;
grant execute on function public.wisp_end_call(uuid)
  to authenticated;

-- Data API table grants are explicit because this project does not
-- auto-expose newly created tables. RLS remains the row-level boundary.
grant usage on schema public to authenticated, service_role;

revoke all privileges on table public.wisp_profiles
  from public, anon, authenticated;
revoke all privileges on table public.wisp_contacts
  from public, anon, authenticated;
revoke all privileges on table public.wisp_blocks
  from public, anon, authenticated;
revoke all privileges on table public.wisp_chats
  from public, anon, authenticated;
revoke all privileges on table public.wisp_chat_members
  from public, anon, authenticated;
revoke all privileges on table public.wisp_messages
  from public, anon, authenticated;
revoke all privileges on table public.wisp_message_receipts
  from public, anon, authenticated;
revoke all privileges on table public.wisp_calls
  from public, anon, authenticated;
revoke all privileges on table public.wisp_call_participants
  from public, anon, authenticated;

grant select on table public.wisp_profiles to authenticated;
grant update (
  username,
  bio,
  avatar_url,
  status,
  show_online_status,
  show_read_receipts,
  last_seen
) on public.wisp_profiles to authenticated;
grant select, delete on table public.wisp_contacts to authenticated;
grant insert (owner_id, contact_id)
  on public.wisp_contacts to authenticated;
grant select, delete on table public.wisp_blocks to authenticated;
grant insert (owner_id, blocked_id)
  on public.wisp_blocks to authenticated;
grant select on table public.wisp_chats to authenticated;
grant select on table public.wisp_chat_members to authenticated;
grant select on table public.wisp_messages to authenticated;
grant insert (chat_id, sender_id, content)
  on public.wisp_messages to authenticated;
grant select on table public.wisp_message_receipts to authenticated;
grant insert (message_id, user_id)
  on public.wisp_message_receipts to authenticated;
grant select on table public.wisp_calls to authenticated;
grant select on table public.wisp_call_participants to authenticated;

grant all privileges on table public.wisp_profiles to service_role;
grant all privileges on table public.wisp_contacts to service_role;
grant all privileges on table public.wisp_blocks to service_role;
grant all privileges on table public.wisp_chats to service_role;
grant all privileges on table public.wisp_chat_members to service_role;
grant all privileges on table public.wisp_messages to service_role;
grant all privileges on table public.wisp_message_receipts to service_role;
grant all privileges on table public.wisp_calls to service_role;
grant all privileges on table public.wisp_call_participants to service_role;

-- Chat messages use Postgres Changes. WebRTC descriptions and ICE candidates
-- use a private Broadcast channel and are never stored in these tables.
do $block$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wisp_messages'
  ) then
    alter publication supabase_realtime add table public.wisp_messages;
  end if;
end
$block$;

-- These policies are evaluated only for private channels. The hosted
-- Realtime setting "Allow public access" must remain disabled, and Wisp's
-- client must subscribe with config.private=true.
drop policy if exists wisp_call_receive on realtime.messages;
create policy wisp_call_receive
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and wisp_private.can_signal_topic((select realtime.topic()))
  );

drop policy if exists wisp_call_send on realtime.messages;
create policy wisp_call_send
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.event in (
      'offer',
      'answer',
      'ice-candidate',
      'end'
    )
    and wisp_private.can_signal_topic((select realtime.topic()))
  );

notify pgrst, 'reload schema';
