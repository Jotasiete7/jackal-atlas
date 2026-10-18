-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 018: HARDENING FROM CODE REVIEW
-- 1. Discord name, avatar and ID come from auth.identities (written only by the
--    Discord login), not from user metadata, which users can edit themselves.
-- 2. Only real Discord sign-ups can become the first admin (app metadata is server-set).
-- 3. Deleting a user keeps the map: their commits, strokes, points and routes stay
--    (author/creator becomes empty) instead of being erased or blocking the delete.
-- 4. Sketch commits: limit is race-free, with an hourly stroke cap and a payload size cap.
-- 5. Members can only erase pre-versioning strokes they can see.
-- 6. Direct stroke updates cannot move strokes between commits or forge who confirmed them.
-- 7. Admin demotion and first-admin promotion are serialised (no zero-admin race).
-- Run AFTER migrations 001-017.
-- ==============================================================================

-- ---------- 1 + 2. Discord identity from auth.identities ----------

-- Profile row is created on sign-up; Discord fields are filled from the identity below
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_initial_role public.app_role := 'pending';
begin
  -- First Discord sign-up becomes admin. raw_app_meta_data is set by the auth server, not the user.
  perform pg_advisory_xact_lock(hashtext('jackal_atlas_admins'));
  if new.raw_app_meta_data->>'provider' = 'discord'
     and not exists (select 1 from public.profiles where role = 'admin') then
    v_initial_role := 'admin'::public.app_role;
  end if;

  insert into public.profiles (id, role)
  values (new.id, v_initial_role)
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise warning 'handle_new_user notice: %', sqlerrm;
    return new;
end;
$$;

-- Copies Discord ID, name and avatar from the Discord identity (inserted/updated by each Discord login)
create or replace function public.sync_profile_from_identity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_discord_id text := nullif(coalesce(new.identity_data->>'provider_id', new.identity_data->>'sub', new.provider_id), '');
  v_name text := public.discord_display_name(new.identity_data);
  v_avatar text := public.discord_avatar_url(new.identity_data);
begin
  if new.provider <> 'discord' then
    return new;
  end if;

  update public.profiles
  set discord_id = coalesce(v_discord_id, discord_id),
      discord_username = coalesce(v_name, discord_username),
      avatar_url = coalesce(v_avatar, avatar_url)
  where id = new.user_id
    and (discord_id is distinct from coalesce(v_discord_id, discord_id)
         or discord_username is distinct from coalesce(v_name, discord_username)
         or avatar_url is distinct from coalesce(v_avatar, avatar_url));
  return new;
exception
  when others then
    raise warning 'sync_profile_from_identity notice: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_identity_changed on auth.identities;
create trigger on_auth_identity_changed
  after insert or update of identity_data on auth.identities
  for each row execute function public.sync_profile_from_identity();

-- User metadata is user-editable (supabase.auth.updateUser), so it no longer feeds the profile
drop trigger if exists on_auth_user_metadata_updated on auth.users;
drop function if exists public.sync_profile_from_auth();

-- Profile guard: same rules as 017. ID/Discord checks apply to API users only, so the
-- identity sync (run by the auth server) can fill in the Discord ID. Admin demotion is serialised.
create or replace function public.guard_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_api boolean := coalesce(current_setting('role', true), '') in ('authenticated', 'anon');
begin
  if v_api and not public.is_admin() then
    if new.role <> old.role then
      raise exception 'Only administrators can change user roles.';
    end if;
    if new.discord_id is distinct from old.discord_id then
      raise exception 'Changing the Discord ID is not allowed.';
    end if;
    if new.id <> old.id then
      raise exception 'Changing the user ID is not allowed.';
    end if;
    if new.guild_id is distinct from old.guild_id then
      raise exception 'Only administrators can change a member''s guild.';
    end if;
    if new.discord_username is distinct from old.discord_username
       or new.avatar_url is distinct from old.avatar_url then
      raise exception 'Your Discord name and avatar are updated automatically when you sign in.';
    end if;
  end if;
  if v_api and public.is_admin() and new.id <> old.id then
    raise exception 'Changing the user ID is not allowed.';
  end if;

  -- Keep at least one admin (locked so two admins cannot demote each other at once)
  if old.role = 'admin' and new.role <> 'admin' then
    perform pg_advisory_xact_lock(hashtext('jackal_atlas_admins'));
    if not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'This is the last administrator. Promote someone else to admin first.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Backfill from identities (overrides any name/avatar set through user metadata)
update public.profiles p
set discord_id = coalesce(nullif(coalesce(i.identity_data->>'provider_id', i.identity_data->>'sub', i.provider_id), ''), p.discord_id),
    discord_username = coalesce(public.discord_display_name(i.identity_data), p.discord_username),
    avatar_url = coalesce(public.discord_avatar_url(i.identity_data), p.avatar_url)
from auth.identities i
where i.user_id = p.id and i.provider = 'discord';

-- ---------- 3. Deleting a user keeps their map work ----------
alter table public.sketch_commits alter column author drop not null;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('sketch_commits', 'sketch_commits_author_fkey', 'author'),
      ('sketch_commits', 'sketch_commits_approved_by_fkey', 'approved_by'),
      ('sketch_commits', 'sketch_commits_reviewed_by_fkey', 'reviewed_by'),
      ('sketch_commits', 'sketch_commits_reverted_by_fkey', 'reverted_by'),
      ('sketch_strokes', 'sketch_strokes_created_by_fkey', 'created_by'),
      ('sketch_strokes', 'sketch_strokes_confirmed_by_fkey', 'confirmed_by'),
      ('points', 'points_created_by_fkey', 'created_by'),
      ('points', 'points_confirmed_by_fkey', 'confirmed_by'),
      ('point_events', 'point_events_actor_id_fkey', 'actor_id'),
      ('point_events', 'point_events_confirmed_by_fkey', 'confirmed_by'),
      ('objectives', 'objectives_assigned_to_fkey', 'assigned_to'),
      ('objectives', 'objectives_created_by_fkey', 'created_by'),
      ('routes', 'routes_created_by_fkey', 'created_by')
    ) as t(tbl, con, col)
  loop
    -- Only touch columns that exist and are nullable
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = r.tbl and column_name = r.col and is_nullable = 'YES') then
      execute format('alter table public.%I drop constraint if exists %I', r.tbl, r.con);
      execute format('alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete set null',
                     r.tbl, r.con, r.col);
    end if;
  end loop;
end $$;

-- ---------- 4 + 5. Sketch commit limits and legacy erase visibility ----------
create or replace function public.sketch_commit_create(p_message text, p_strokes jsonb, p_erase uuid[] default '{}'::uuid[])
returns public.sketch_commits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer boolean := public.is_officer();
  v_strokes integer;
  v_erase uuid[] := coalesce(p_erase, '{}');
  v_commit public.sketch_commits;
begin
  if not public.is_approved_member() then
    raise exception 'Only approved members can commit sketches.';
  end if;
  if p_message is null or char_length(btrim(p_message)) = 0 then
    raise exception 'A commit message is required.';
  end if;
  if char_length(btrim(p_message)) > 200 then
    raise exception 'Commit messages are limited to 200 characters.';
  end if;
  if p_strokes is null or jsonb_typeof(p_strokes) <> 'array' then
    raise exception 'Strokes must be a JSON array.';
  end if;
  if octet_length(p_strokes::text) > 2000000 then
    raise exception 'This commit is too large (over 2 MB). Split it into smaller commits.';
  end if;

  v_strokes := jsonb_array_length(p_strokes);
  if v_strokes = 0 and cardinality(v_erase) = 0 then
    raise exception 'Nothing to commit.';
  end if;
  if v_strokes > 500 or cardinality(v_erase) > 500 then
    raise exception 'A commit can add or erase at most 500 strokes. Split it into smaller commits.';
  end if;

  if not v_officer then
    -- One commit at a time per member, so parallel calls cannot skip the limits
    perform pg_advisory_xact_lock(hashtext('sketch_commit:' || auth.uid()::text));
    if (select count(*) from public.sketch_commits
        where author = auth.uid() and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'Commit limit reached (30 per hour). Try again later.';
    end if;
    if (select coalesce(sum(stroke_count), 0) from public.sketch_commits
        where author = auth.uid() and created_at > now() - interval '1 hour') + v_strokes > 2000 then
      raise exception 'Stroke limit reached (2000 per hour). Try again later.';
    end if;
  end if;

  insert into public.sketch_commits (author, message, status, stroke_count, erase_count, approved_by, approved_at)
  values (
    auth.uid(),
    btrim(p_message),
    case when v_officer then 'approved'::sketch_commit_status else 'pending'::sketch_commit_status end,
    v_strokes,
    0,
    case when v_officer then auth.uid() end,
    case when v_officer then now() end
  )
  returning * into v_commit;

  insert into public.sketch_strokes (kind, path, width, label, stamp, color, opacity, rotation, commit_id)
  select
    (e->>'kind')::sketch_kind,
    e->'path',
    coalesce((e->>'width')::numeric, 6),
    nullif(e->>'label', ''),
    nullif(e->>'stamp', '')::sketch_stamp,
    nullif(e->>'color', ''),
    (e->>'opacity')::numeric,
    (e->>'rotation')::numeric,
    v_commit.id
  from jsonb_array_elements(p_strokes) as e;

  -- Erase only strokes this user can see: committed strokes via their commit, and
  -- pre-versioning strokes only when confirmed, their own, or the user is an officer
  insert into public.sketch_commit_erasures (commit_id, stroke_id)
  select v_commit.id, s.id
  from public.sketch_strokes s
  where s.id = any (v_erase)
    and s.commit_id is distinct from v_commit.id
    and (
      (s.commit_id is null and (s.confirmed or s.created_by = auth.uid() or v_officer))
      or (s.commit_id is not null and public.can_read_sketch_commit(s.commit_id))
    )
  on conflict do nothing;

  update public.sketch_commits
  set erase_count = (select count(*) from public.sketch_commit_erasures where commit_id = v_commit.id)
  where id = v_commit.id
  returning * into v_commit;

  return v_commit;
end;
$$;

revoke all on function public.sketch_commit_create(text, jsonb, uuid[]) from public, anon;
grant execute on function public.sketch_commit_create(text, jsonb, uuid[]) to authenticated;

-- ---------- 6. Stroke guard freezes the commit link and who confirmed ----------
create or replace function public.guard_sketch_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Foreign-key cascades (deleting a user empties created_by / confirmed_by) run nested
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not public.is_officer() then
    raise exception 'Only Officers and Administrators can approve or edit sketches.';
  end if;
  new.kind := old.kind;
  new.path := old.path;
  new.width := old.width;
  new.label := old.label;
  new.stamp := old.stamp;
  new.color := old.color;
  new.opacity := old.opacity;
  new.rotation := old.rotation;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.commit_id := old.commit_id;
  if new.confirmed and not old.confirmed then
    new.confirmed_by := auth.uid();
  elsif new.confirmed then
    new.confirmed_by := old.confirmed_by;
  else
    new.confirmed_by := null;
  end if;
  return new;
end;
$$;
