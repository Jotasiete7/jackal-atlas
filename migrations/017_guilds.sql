-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 017: GUILDS
-- Several guilds share the Atlas. Admins create guilds (name, short tag, colour) and
-- assign each member to one; the map and admin panel show the tag next to names.
-- Members cannot change their own guild. Run AFTER migrations 001-016.
-- ==============================================================================

-- 1. Guilds
create table if not exists public.guilds (
    id uuid primary key default gen_random_uuid(),
    name text not null unique check (char_length(btrim(name)) between 2 and 40),
    tag text not null unique check (tag ~ '^[A-Za-z0-9]{1,6}$'),
    color text not null default '#f5a623' check (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_by uuid references public.profiles(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now()
);

alter table public.guilds enable row level security;

drop policy if exists "Approved members see guilds" on public.guilds;
create policy "Approved members see guilds"
  on public.guilds for select
  using (public.is_approved_member());

drop policy if exists "Admins create guilds" on public.guilds;
create policy "Admins create guilds"
  on public.guilds for insert
  with check (public.is_admin());

drop policy if exists "Admins edit guilds" on public.guilds;
create policy "Admins edit guilds"
  on public.guilds for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete guilds" on public.guilds;
create policy "Admins delete guilds"
  on public.guilds for delete
  using (public.is_admin());

-- 2. Each member belongs to at most one guild (deleting a guild leaves its members unassigned)
alter table public.profiles
  add column if not exists guild_id uuid references public.guilds(id) on delete set null;

create index if not exists idx_profiles_guild on public.profiles(guild_id);

-- 3. Profile guard: same as migration 013, plus only admins change a member's guild
create or replace function public.guard_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Non-admins cannot change their own role, IDs or guild
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
    if new.guild_id is distinct from old.guild_id
       and coalesce(current_setting('role', true), '') in ('authenticated', 'anon') then
      raise exception 'Only administrators can change a member''s guild.';
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

-- 4. Live updates for the map's guild tags
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guilds') then
    alter publication supabase_realtime add table public.guilds;
  end if;
end $$;
