-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 014: GIT-STYLE VERSIONING FOR THE SKETCH LAYER
-- Sketches are drafted privately in the browser, then committed with a message.
-- A commit holds the strokes it adds and the strokes it erases. Officers' and Admins'
-- commits are approved automatically; members' commits wait for an Officer, who approves
-- or rejects the whole commit. Officers can revert an approved commit (its strokes are
-- hidden, never deleted) and restore it later. The full history stays readable so the
-- map can be viewed as it was at any commit.
-- Run AFTER migrations 001-013.
-- ==============================================================================

create type sketch_commit_status as enum ('pending', 'approved', 'rejected', 'reverted');

-- 1. Commits
create table public.sketch_commits (
    id uuid primary key default gen_random_uuid(),
    author uuid not null references public.profiles(id) on delete cascade default auth.uid(),
    message text not null,
    status sketch_commit_status not null default 'pending',
    stroke_count integer not null default 0,
    erase_count integer not null default 0,
    approved_by uuid references public.profiles(id),
    approved_at timestamptz,
    reviewed_by uuid references public.profiles(id),
    reviewed_at timestamptz,
    reverted_by uuid references public.profiles(id),
    reverted_at timestamptz,
    created_at timestamptz not null default now(),
    constraint chk_sketch_commit_message check (char_length(btrim(message)) between 1 and 200)
);

create index idx_sketch_commits_created_at on public.sketch_commits(created_at);
create index idx_sketch_commits_status on public.sketch_commits(status);
create index idx_sketch_commits_author on public.sketch_commits(author);

alter table public.sketch_commits enable row level security;

-- 2. Strokes belong to a commit (strokes drawn before versioning keep commit_id = null)
alter table public.sketch_strokes
  add column if not exists commit_id uuid references public.sketch_commits(id) on delete cascade;
create index if not exists idx_sketch_strokes_commit on public.sketch_strokes(commit_id);

-- 3. Strokes erased by a commit
create table public.sketch_commit_erasures (
    commit_id uuid not null references public.sketch_commits(id) on delete cascade,
    stroke_id uuid not null references public.sketch_strokes(id) on delete cascade,
    primary key (commit_id, stroke_id)
);

create index idx_sketch_commit_erasures_stroke on public.sketch_commit_erasures(stroke_id);

alter table public.sketch_commit_erasures enable row level security;

-- 4. Visibility: approved and reverted commits are public history; authors see their own
--    pending/rejected commits; Officers and Admins see everything.
create or replace function public.can_read_sketch_commit(p_commit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sketch_commits c
    where c.id = p_commit
      and (c.status in ('approved', 'reverted')
           or (auth.uid() is not null and c.author = auth.uid())
           or public.is_officer())
  );
$$;

grant execute on function public.can_read_sketch_commit(uuid) to anon, authenticated;

create policy "Read sketch commit history"
  on public.sketch_commits
  for select
  using (
    status in ('approved', 'reverted')
    or (auth.uid() is not null and author = auth.uid())
    or public.is_officer()
  );

create policy "Read sketch commit erasures"
  on public.sketch_commit_erasures
  for select
  using (public.can_read_sketch_commit(commit_id));

-- Commits, their strokes and erasures are only written through the RPCs below
-- (no insert/update/delete policies on sketch_commits or sketch_commit_erasures).

drop policy if exists "Public read of approved sketches" on public.sketch_strokes;
create policy "Read sketches by commit visibility"
  on public.sketch_strokes
  for select
  using (
    case
      when commit_id is null then
        confirmed = true
        or (auth.uid() is not null and created_by = auth.uid())
        or public.is_officer()
      else public.can_read_sketch_commit(commit_id)
    end
  );

-- Strokes are now added only through commits, and history is never erased by authors.
drop policy if exists "Approved members draw sketches with rate limit" on public.sketch_strokes;
drop policy if exists "Author or officers erase sketches" on public.sketch_strokes;
create policy "Officers delete sketches"
  on public.sketch_strokes
  for delete
  using (public.is_officer());

-- 5. Create a commit atomically: the commit row, its strokes and its erasures
create or replace function public.sketch_commit_create(
  p_message text,
  p_strokes jsonb,
  p_erase uuid[] default '{}'
)
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

  v_strokes := jsonb_array_length(p_strokes);
  if v_strokes = 0 and cardinality(v_erase) = 0 then
    raise exception 'Nothing to commit.';
  end if;
  if v_strokes > 500 or cardinality(v_erase) > 500 then
    raise exception 'A commit can add or erase at most 500 strokes. Split it into smaller commits.';
  end if;

  -- Members: at most 30 commits per hour (Officers and Admins are not limited)
  if not v_officer and (
    select count(*) from public.sketch_commits
    where author = auth.uid() and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Commit limit reached (30 per hour). Try again later.';
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

  insert into public.sketch_strokes (kind, path, width, label, stamp, commit_id)
  select
    (e->>'kind')::sketch_kind,
    e->'path',
    coalesce((e->>'width')::numeric, 6),
    nullif(e->>'label', ''),
    nullif(e->>'stamp', '')::sketch_stamp,
    v_commit.id
  from jsonb_array_elements(p_strokes) as e;

  -- Only strokes the author can currently see can be erased
  insert into public.sketch_commit_erasures (commit_id, stroke_id)
  select v_commit.id, s.id
  from public.sketch_strokes s
  where s.id = any (v_erase)
    and s.commit_id is distinct from v_commit.id
    and (s.commit_id is null or public.can_read_sketch_commit(s.commit_id))
  on conflict do nothing;

  update public.sketch_commits
  set erase_count = (select count(*) from public.sketch_commit_erasures where commit_id = v_commit.id)
  where id = v_commit.id
  returning * into v_commit;

  -- (The insert trigger from migration 011 already marks Officers' strokes as confirmed.)
  return v_commit;
end;
$$;

-- 6. Officer review: approve / reject a pending commit, revert / restore an approved one
create or replace function public.sketch_commit_review(p_commit uuid, p_action text)
returns public.sketch_commits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commit public.sketch_commits;
begin
  if not public.is_officer() then
    raise exception 'Only Officers and Administrators can review sketch commits.';
  end if;

  select * into v_commit from public.sketch_commits where id = p_commit for update;
  if not found then
    raise exception 'Commit not found.';
  end if;

  if p_action = 'approve' then
    if v_commit.status <> 'pending' then raise exception 'Only pending commits can be approved.'; end if;
    update public.sketch_commits
    set status = 'approved', approved_by = auth.uid(), approved_at = now(), reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_commit returning * into v_commit;
    update public.sketch_strokes set confirmed = true where commit_id = p_commit;
  elsif p_action = 'reject' then
    if v_commit.status <> 'pending' then raise exception 'Only pending commits can be rejected.'; end if;
    update public.sketch_commits
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_commit returning * into v_commit;
  elsif p_action = 'revert' then
    if v_commit.status <> 'approved' then raise exception 'Only approved commits can be reverted.'; end if;
    update public.sketch_commits
    set status = 'reverted', reverted_by = auth.uid(), reverted_at = now()
    where id = p_commit returning * into v_commit;
    update public.sketch_strokes set confirmed = false where commit_id = p_commit;
  elsif p_action = 'restore' then
    if v_commit.status <> 'reverted' then raise exception 'Only reverted commits can be restored.'; end if;
    update public.sketch_commits
    set status = 'approved', reverted_by = null, reverted_at = null
    where id = p_commit returning * into v_commit;
    update public.sketch_strokes set confirmed = true where commit_id = p_commit;
  else
    raise exception 'Unknown action: %', p_action;
  end if;

  return v_commit;
end;
$$;

revoke execute on function public.sketch_commit_create(text, jsonb, uuid[]) from public, anon;
revoke execute on function public.sketch_commit_review(uuid, text) from public, anon;
grant execute on function public.sketch_commit_create(text, jsonb, uuid[]) to authenticated;
grant execute on function public.sketch_commit_review(uuid, text) to authenticated;

-- 7. Only Discord sign-ups can become the first admin (test or email accounts never do)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_discord_id text;
  v_initial_role public.app_role := 'pending';
begin
  v_discord_id := coalesce(
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'sub'
  );

  -- The first Discord user registered becomes admin automatically
  if v_discord_id is not null and not exists (select 1 from public.profiles where role = 'admin') then
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
    raise warning 'handle_new_user notice: %', sqlerrm;
    return new;
end;
$$;

-- 8. Live updates for the history panel
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['sketch_commits', 'sketch_commit_erasures'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
