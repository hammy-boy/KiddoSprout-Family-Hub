-- Curated recipes stay bundled in the web app. This table stores only recipes
-- created by a signed-in family, with ownership enforced at the database layer.
-- Every statement is safe to run again while diagnosing a partially applied setup.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  ingredients text[] not null,
  steps text[] not null,
  created_at timestamptz not null default now()
);

comment on table public.recipes is
  'Family-created recipes. Curated recipes remain bundled with the application.';

create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists recipes_title_idx on public.recipes (title);

-- CHECK constraints cannot contain a subquery directly, so this small immutable
-- helper validates every array element. It reads no tables and changes no data.
create or replace function public.recipe_text_items_within_limit(
  items text[],
  maximum_characters integer
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select coalesce(
    bool_and(
      item is not null
      and item = btrim(item)
      and char_length(item) between 1 and maximum_characters
    ),
    false
  )
  from unnest(items) as recipe_item(item)
$function$;

revoke all on function public.recipe_text_items_within_limit(text[], integer)
  from public, anon, authenticated;
grant execute on function public.recipe_text_items_within_limit(text[], integer)
  to authenticated;

-- Add each constraint only when absent so re-running this migration is idempotent.
do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_title_length'
  ) then
    alter table public.recipes add constraint recipes_title_length
      check (title = btrim(title) and char_length(title) between 1 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_category_length'
  ) then
    alter table public.recipes add constraint recipes_category_length
      check (category = btrim(category) and char_length(category) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_ingredients_count'
  ) then
    alter table public.recipes add constraint recipes_ingredients_count
      check (cardinality(ingredients) between 1 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_steps_count'
  ) then
    alter table public.recipes add constraint recipes_steps_count
      check (cardinality(steps) between 1 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_ingredients_no_nulls'
  ) then
    alter table public.recipes add constraint recipes_ingredients_no_nulls
      check (array_position(ingredients, null) is null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_steps_no_nulls'
  ) then
    alter table public.recipes add constraint recipes_steps_no_nulls
      check (array_position(steps, null) is null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_ingredients_text_size'
  ) then
    alter table public.recipes add constraint recipes_ingredients_text_size
      check (
        array_position(ingredients, '') is null
        and array_to_string(ingredients, E'\n') !~ E'(^|\n)[[:space:]]*(\n|$)'
        and octet_length(array_to_string(ingredients, E'\n')) between 1 and 100000
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_ingredients_item_length'
  ) then
    alter table public.recipes add constraint recipes_ingredients_item_length
      check (public.recipe_text_items_within_limit(ingredients, 1000));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_steps_text_size'
  ) then
    alter table public.recipes add constraint recipes_steps_text_size
      check (
        array_position(steps, '') is null
        and array_to_string(steps, E'\n') !~ E'(^|\n)[[:space:]]*(\n|$)'
        and octet_length(array_to_string(steps, E'\n')) between 1 and 400000
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and conname = 'recipes_steps_item_length'
  ) then
    alter table public.recipes add constraint recipes_steps_item_length
      check (public.recipe_text_items_within_limit(steps, 4000));
  end if;
end
$migration$;

alter table public.recipes enable row level security;

drop policy if exists recipes_select_own on public.recipes;
create policy recipes_select_own
  on public.recipes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists recipes_insert_own on public.recipes;
create policy recipes_insert_own
  on public.recipes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists recipes_update_own on public.recipes;
create policy recipes_update_own
  on public.recipes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists recipes_delete_own on public.recipes;
create policy recipes_delete_own
  on public.recipes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Data API grants are deliberately explicit. Supabase stopped auto-exposing new
-- public tables by default for new projects in 2026; grants and RLS are separate.
revoke all privileges on table public.recipes from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, delete on table public.recipes to authenticated;
grant insert (user_id, title, category, ingredients, steps)
  on table public.recipes to authenticated;
grant update (title, category, ingredients, steps)
  on table public.recipes to authenticated;

notify pgrst, 'reload schema';
