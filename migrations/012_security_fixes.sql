-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 012: SECURITY FIXES
-- 1. Profiles can only be created by the sign-up trigger (no client inserts)
-- 2. Only admins change roles, and the last admin cannot be demoted
-- 3. Re-saving an already approved event no longer re-applies it (double reinforcement)
-- 4. Officers can approve landmarks and log events on them; only admins edit their content
-- Run AFTER migrations 001-011.
-- ==============================================================================

-- 1. Profiles: the handle_new_user() trigger (SECURITY DEFINER, table owner) creates every
--    profile and is not subject to RLS. Migration 007 opened inserts to
--    "auth.uid() = id OR auth.uid() IS NULL", which let anonymous requests insert rows and let a
--    user without a profile insert their own with any role (including admin).
drop policy if exists "Permitir insercao de perfil" on public.profiles;
drop policy if exists "Apenas o sistema insere perfis via trigger" on public.profiles;

create policy "Only the sign-up trigger creates profiles"
  on public.profiles
  for insert
  with check (false);

-- 2. Roles: only admins change roles (unchanged), plus a guard so the last admin cannot be
--    demoted or removed by mistake, which would lock everyone out of the admin panel.
create or replace function public.guard_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Non-admins cannot change their own role or IDs
  if not public.is_admin() then
    if new.role <> old.role then
      raise exception 'Only administrators can change user roles.';
    end if;
    if new.discord_id is distinct from old.discord_id then
      raise exception 'Changing the Discord ID is not allowed.';
    end if;
    if new.id <> old.id then
      raise exception 'Changing the user ID is not allowed.';
    end if;
  end if;

  -- Keep at least one admin
  if old.role = 'admin' and new.role <> 'admin'
     and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
    raise exception 'This is the last administrator. Promote someone else to admin first.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_last_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin'
     and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
    raise exception 'This is the last administrator and cannot be deleted.';
  end if;
  return old;
end;
$$;

drop trigger if exists on_profile_delete_guard on public.profiles;
create trigger on_profile_delete_guard
  before delete on public.profiles
  for each row execute function public.guard_last_admin_delete();

-- 3. Events: apply an event's state change exactly once, when it is inserted already approved
--    or when its approval flips from false to true. Previously the trigger also fired when an
--    approved event was saved again, so a "reinforced" event could add +1 twice.
drop trigger if exists on_point_event_applied on public.point_events;
drop trigger if exists on_point_event_applied_insert on public.point_events;
drop trigger if exists on_point_event_applied_approval on public.point_events;

create trigger on_point_event_applied_insert
  after insert on public.point_events
  for each row
  when (new.confirmed)
  execute function public.apply_point_event_state();

create trigger on_point_event_applied_approval
  after update of confirmed on public.point_events
  for each row
  when (new.confirmed and not old.confirmed)
  execute function public.apply_point_event_state();

-- 4. Landmarks (place names): only admins create them or change what they say and where they
--    are. Officers may still approve them and record events (which change status/confirmation).
create or replace function public.check_landmark_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.kind = 'landmark' then
      raise exception 'Only administrators can add place names (landmarks) on the map.';
    end if;
    return new;
  end if;

  -- UPDATE: block turning a point into a landmark, or editing a landmark's content
  if new.kind = 'landmark' or old.kind = 'landmark' then
    if (new.kind, new.name, new.x, new.y, new.z, new.faction, new.attrs, new.priority)
       is distinct from
       (old.kind, old.name, old.x, old.y, old.z, old.faction, old.attrs, old.priority) then
      raise exception 'Only administrators can edit place names (landmarks) on the map.';
    end if;
  end if;
  return new;
end;
$$;
