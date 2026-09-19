-- Harden recipe databases that may already have run the original table migration.
-- This migration is additive: it does not rewrite recipe data or contact a hosted
-- project. Existing rows must satisfy the same bounds already enforced by the app.

-- PostgreSQL CHECK expressions cannot contain a subquery, so use a small,
-- immutable, security-invoker helper to validate every text-array element.
create or replace function public.recipe_text_items_within_limit(
  items text[],
  maximum_characters integer
)
returns boolean
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $function$
  select coalesce(
    bool_and(
      item is not null
      and char_length(item) between 1 and maximum_characters
      and item !~ '^[[:space:]]'
      and item !~ '[[:space:]]$'
    ),
    false
  )
  from unnest(items) as recipe_item(item)
$function$;

comment on function public.recipe_text_items_within_limit(text[], integer) is
  'Validates non-empty, trimmed recipe text-array items against a character limit.';

-- Functions receive EXECUTE for PUBLIC by default. Keep this exposed-schema
-- helper callable only by the roles that can legitimately write recipe rows.
revoke all on function public.recipe_text_items_within_limit(text[], integer)
  from public, anon, authenticated, service_role;
grant execute on function public.recipe_text_items_within_limit(text[], integer)
  to authenticated, service_role;

-- Recreate the constraints so databases that already ran an earlier migration
-- get the exact hardened definitions. NOT VALID shortens the initial lock; the
-- following VALIDATE statements fail safely instead of silently rewriting data.
alter table public.recipes
  drop constraint if exists recipes_ingredients_shape,
  drop constraint if exists recipes_steps_shape,
  drop constraint if exists recipes_ingredients_item_length,
  drop constraint if exists recipes_steps_item_length;

alter table public.recipes
  add constraint recipes_ingredients_shape
    check (
      array_ndims(ingredients) = 1
      and array_lower(ingredients, 1) = 1
      and cardinality(ingredients) between 1 and 100
    ) not valid,
  add constraint recipes_steps_shape
    check (
      array_ndims(steps) = 1
      and array_lower(steps, 1) = 1
      and cardinality(steps) between 1 and 100
    ) not valid,
  add constraint recipes_ingredients_item_length
    check (public.recipe_text_items_within_limit(ingredients, 1000)) not valid,
  add constraint recipes_steps_item_length
    check (public.recipe_text_items_within_limit(steps, 4000)) not valid;

alter table public.recipes validate constraint recipes_ingredients_shape;
alter table public.recipes validate constraint recipes_steps_shape;
alter table public.recipes validate constraint recipes_ingredients_item_length;
alter table public.recipes validate constraint recipes_steps_item_length;

-- Grants decide which columns the Data API may write; RLS separately decides
-- which rows. Owners can still read/delete their rows and write recipe content,
-- but browser clients cannot supply id/created_at or update id/user_id/created_at.
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

revoke all privileges on table public.recipes
  from public, anon, authenticated;
grant usage on schema public to authenticated, service_role;
grant select, delete on table public.recipes to authenticated;
grant insert (user_id, title, category, ingredients, steps)
  on table public.recipes to authenticated;
grant update (title, category, ingredients, steps)
  on table public.recipes to authenticated;

-- Trusted server code retains full table access. The service-role key must never
-- be present in browser code; it bypasses RLS by design.
grant select, insert, update, delete on table public.recipes to service_role;

notify pgrst, 'reload schema';
