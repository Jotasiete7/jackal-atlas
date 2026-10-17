-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 015: FREE COLOURS AND OPACITY FOR SKETCHES
-- Adds a plain "pen" stroke type with any colour, plus per-stroke opacity, so the
-- Sketch layer works like a whiteboard (colour palette) instead of fixed terrain types.
-- Older strokes (water, forest, ridge, sand, rock, arrow) keep rendering as before.
-- Run AFTER migrations 001-014.
-- ==============================================================================

-- The new enum value is not used elsewhere in this script, so this is safe in one run.
alter type sketch_kind add value if not exists 'pen';

alter table public.sketch_strokes
  add column if not exists color text,
  add column if not exists opacity numeric;

alter table public.sketch_strokes drop constraint if exists chk_sketch_color;
alter table public.sketch_strokes
  add constraint chk_sketch_color check (color is null or color ~ '^#[0-9a-fA-F]{6}$');

alter table public.sketch_strokes drop constraint if exists chk_sketch_opacity;
alter table public.sketch_strokes
  add constraint chk_sketch_opacity check (opacity is null or (opacity >= 0.05 and opacity <= 1));

-- 1. Strokes stay immutable apart from approval (now including colour and opacity)
create or replace function public.guard_sketch_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  if new.confirmed and not old.confirmed then
    new.confirmed_by := auth.uid();
  elsif not new.confirmed then
    new.confirmed_by := null;
  end if;
  return new;
end;
$$;

-- 2. Commits store each stroke's colour and opacity (same checks as migration 014)
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

  insert into public.sketch_strokes (kind, path, width, label, stamp, color, opacity, commit_id)
  select
    (e->>'kind')::sketch_kind,
    e->'path',
    coalesce((e->>'width')::numeric, 6),
    nullif(e->>'label', ''),
    nullif(e->>'stamp', '')::sketch_stamp,
    nullif(e->>'color', ''),
    (e->>'opacity')::numeric,
    v_commit.id
  from jsonb_array_elements(p_strokes) as e;

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

  return v_commit;
end;
$$;

revoke execute on function public.sketch_commit_create(text, jsonb, uuid[]) from public, anon;
grant execute on function public.sketch_commit_create(text, jsonb, uuid[]) to authenticated;
