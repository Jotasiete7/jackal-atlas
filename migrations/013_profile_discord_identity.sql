-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 013: DISCORD NAME AND AVATAR ON PROFILES
-- Stores each member's Discord display name and avatar so the admin panel can show
-- who is who instead of raw Discord ID numbers. Filled at sign-up, refreshed whenever
-- Discord sends new profile data on sign-in, and backfilled for existing users.
-- Run AFTER migrations 001-012.
-- ==============================================================================

alter table public.profiles
  add column if not exists discord_username text,
  add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists chk_profiles_discord_username;
alter table public.profiles
  add constraint chk_profiles_discord_username check (discord_username is null or char_length(discord_username) <= 64);

-- Only Discord CDN avatars, with URL-safe characters (the admin panel puts this in an <img src>)
alter table public.profiles drop constraint if exists chk_profiles_avatar_url;
alter table public.profiles
  add constraint chk_profiles_avatar_url check (avatar_url is null or avatar_url ~ '^https://cdn\.discordapp\.com/[A-Za-z0-9_./?=&-]+$');

-- 1. Helpers that read the Discord identity from Supabase Auth metadata
create or replace function public.discord_display_name(meta jsonb)
returns text
language sql
immutable
as $$
  select left(nullif(btrim(coalesce(
    meta->'custom_claims'->>'global_name',
    meta->>'full_name',
    meta->>'name',
    meta->>'user_name',
    meta->>'preferred_username'
  )), ''), 64);
$$;

create or replace function public.discord_avatar_url(meta jsonb)
returns text
language sql
immutable
as $$
  select case
    when coalesce(meta->>'avatar_url', meta->>'picture') ~ '^https://cdn\.discordapp\.com/[A-Za-z0-9_./?=&-]+$'
      then coalesce(meta->>'avatar_url', meta->>'picture')
    else null
  end;
$$;

-- 2. Sign-up trigger: same as migration 007, plus the Discord name and avatar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_discord_id text;
  v_count integer;
  v_initial_role public.app_role := 'pending';
begin
  -- Extract the Discord ID from the OAuth metadata
  v_discord_id := coalesce(
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'sub'
  );

  -- If this is the first user registered in the database, they get admin automatically
  select count(*) into v_count from public.profiles;
  if v_count = 0 then
    v_initial_role := 'admin'::public.app_role;
  end if;

  insert into public.profiles (id, discord_id, role, discord_username, avatar_url)
  values (
    new.id,
    v_discord_id,
    v_initial_role,
    public.discord_display_name(new.raw_user_meta_data),
    public.discord_avatar_url(new.raw_user_meta_data)
  )
  on conflict (id) do update set
    discord_id = coalesce(excluded.discord_id, public.profiles.discord_id),
    discord_username = coalesce(excluded.discord_username, public.profiles.discord_username),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
exception
  when others then
    -- Never abort the user creation in auth.users
    raise warning 'handle_new_user notice: %', sqlerrm;
    return new;
end;
$$;

-- 3. Refresh name/avatar when Discord sends updated metadata on sign-in
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_name text := public.discord_display_name(new.raw_user_meta_data);
  v_avatar text := public.discord_avatar_url(new.raw_user_meta_data);
begin
  update public.profiles
  set discord_username = coalesce(v_name, discord_username),
      avatar_url = coalesce(v_avatar, avatar_url)
  where id = new.id
    and (discord_username is distinct from coalesce(v_name, discord_username)
         or avatar_url is distinct from coalesce(v_avatar, avatar_url));
  return new;
exception
  when others then
    raise warning 'sync_profile_from_auth notice: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_updated on auth.users;
create trigger on_auth_user_metadata_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth();

-- 4. Members cannot rename themselves or swap avatars through the API (prevents impersonation);
--    the sync above runs outside the API roles and is allowed.
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
    if coalesce(current_setting('role', true), '') in ('authenticated', 'anon')
       and (new.discord_username is distinct from old.discord_username
            or new.avatar_url is distinct from old.avatar_url) then
      raise exception 'Your Discord name and avatar are updated automatically when you sign in.';
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

-- 5. Backfill existing users
update public.profiles p
set discord_username = coalesce(public.discord_display_name(u.raw_user_meta_data), p.discord_username),
    avatar_url = coalesce(public.discord_avatar_url(u.raw_user_meta_data), p.avatar_url)
from auth.users u
where u.id = p.id;
