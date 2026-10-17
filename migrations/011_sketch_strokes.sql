-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 011: SKETCH LAYER (COLLABORATIVE HAND-DRAWN MAP)
-- Whiteboard-style strokes drawn by scouts: water, forest, ridges, sand, rock,
-- arrows, text labels and stamps (camp / tunnel exit / danger).
-- Paths are stored in game tile coordinates [[x, y], ...] (0–4096), not screen pixels.
-- Same approval model as points: members' strokes are pending until an Officer
-- approves them; Officers' and Admins' strokes are approved automatically.
-- Run AFTER migrations 001-010. Then set sketchShared: true in config.js.
-- ==============================================================================

create type sketch_kind as enum (
  'water',
  'forest',
  'ridge',
  'sand',
  'rock',
  'arrow',
  'label',
  'stamp'
);

create type sketch_stamp as enum (
  'camp',
  'tunnel',
  'danger'
);

-- 1. Validates that a path is an array of [x, y] pairs inside the 4096x4096 map
create or replace function public.sketch_path_valid(p jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(p) = 'array'
    and jsonb_array_length(p) between 1 and 2000
    and not exists (
      select 1
      from jsonb_array_elements(p) as pt
      where jsonb_typeof(pt) <> 'array'
         or jsonb_array_length(pt) <> 2
         or jsonb_typeof(pt->0) <> 'number'
         or jsonb_typeof(pt->1) <> 'number'
         or (pt->>0)::numeric not between 0 and 4096
         or (pt->>1)::numeric not between 0 and 4096
    );
$$;

-- 2. Sketch strokes table
create table public.sketch_strokes (
    id uuid primary key default gen_random_uuid(),
    kind sketch_kind not null,
    path jsonb not null,            -- [[x, y], ...] in game tiles; one point for labels and stamps
    width numeric not null default 6, -- brush width in tiles (label font height in tiles)
    label text,                     -- text for kind = 'label'
    stamp sketch_stamp,             -- icon for kind = 'stamp'
    confirmed boolean not null default false,
    confirmed_by uuid references public.profiles(id),
    created_by uuid references public.profiles(id) default auth.uid(),
    created_at timestamptz not null default now(),
    constraint chk_sketch_path check (public.sketch_path_valid(path)),
    constraint chk_sketch_path_size check (length(path::text) < 60000),
    constraint chk_sketch_width check (width >= 1 and width <= 120),
    constraint chk_sketch_label_length check (label is null or char_length(label) <= 80),
    constraint chk_sketch_label_kind check (kind <> 'label' or char_length(btrim(coalesce(label, ''))) > 0),
    constraint chk_sketch_stamp_kind check (kind <> 'stamp' or stamp is not null)
);

create index idx_sketch_strokes_created_at on public.sketch_strokes(created_at);
create index idx_sketch_strokes_confirmed on public.sketch_strokes(confirmed);

alter table public.sketch_strokes enable row level security;

-- 3. Trigger: set the author and auto-approve Officer/Admin strokes (same as points)
create or replace function public.pre_process_sketch_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  if public.is_officer() then
    new.confirmed := true;
    new.confirmed_by := auth.uid();
  else
    new.confirmed := false;
    new.confirmed_by := null;
  end if;
  return new;
end;
$$;

create or replace trigger on_sketch_insert_guard
  before insert on public.sketch_strokes
  for each row execute function public.pre_process_sketch_submission();

-- 4. Trigger: only Officers/Admins may change approval; record who approved
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
  -- Strokes are immutable apart from approval: erase and redraw to change one
  new.kind := old.kind;
  new.path := old.path;
  new.width := old.width;
  new.label := old.label;
  new.stamp := old.stamp;
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

create or replace trigger on_sketch_update_guard
  before update on public.sketch_strokes
  for each row execute function public.guard_sketch_update();

-- 5. RLS policies
-- Everyone (including visitors) sees approved strokes; authors see their own pending ones; Officers see all.
create policy "Public read of approved sketches"
  on public.sketch_strokes
  for select
  using (
    confirmed = true
    or (auth.uid() is not null and created_by = auth.uid())
    or public.is_officer()
  );

-- Approved members draw, at most 300 strokes per hour (freehand drawing makes many small strokes).
-- Officers and Admins have no limit.
create policy "Approved members draw sketches with rate limit"
  on public.sketch_strokes
  for insert
  with check (
    public.is_approved_member() and (
      public.is_officer()
      or (
        select count(*) from public.sketch_strokes
        where created_by = auth.uid()
          and created_at > now() - interval '1 hour'
      ) < 300
    )
  );

create policy "Officers approve sketches"
  on public.sketch_strokes
  for update
  using (public.is_officer())
  with check (public.is_officer());

-- Authors erase their own strokes; Officers and Admins can erase anyone's.
create policy "Author or officers erase sketches"
  on public.sketch_strokes
  for delete
  using (created_by = auth.uid() or public.is_officer());

-- 6. Live updates for the sketch layer (the Atlas subscribes to this table)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.sketch_strokes;
  end if;
end;
$$;
