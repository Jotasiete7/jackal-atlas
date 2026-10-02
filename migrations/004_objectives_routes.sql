-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 004: OBJETIVOS ESTRATÉGICOS (P1/P2/P3) E INFRAESTRUTURA
-- Painel de Futuras Pontes, Estradas, Limpeza de Beacons e Traçados
-- ==============================================================================

create type objective_kind as enum (
  'beacon_clear',
  'beacon_hold',
  'road',
  'bridge',
  'explore',
  'supply',
  'custom'
);

create type objective_status as enum (
  'planned',
  'in_progress',
  'completed',
  'cancelled'
);

create type route_kind as enum (
  'patrol',
  'expedition',
  'road_planned',
  'road_built',
  'bridge_planned',
  'bridge_built'
);

-- 1. Tabela de Objetivos Estratégicos com Prioridades P1 / P2 / P3
create table public.objectives (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    kind objective_kind not null default 'custom',
    priority priority_level not null default 'p2',
    status objective_status not null default 'planned',
    point_id uuid references public.points(id) on delete set null,
    path jsonb,                 -- Array de pontos [[x, y], ...] para estradas/pontes/perímetros
    assigned_to uuid references public.profiles(id),
    created_by uuid references public.profiles(id) default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_objectives_priority on public.objectives(priority);
create index idx_objectives_status on public.objectives(status);

alter table public.objectives enable row level security;

-- 2. Tabela de Traçados de Rotas e Infraestrutura
create table public.routes (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    kind route_kind not null default 'road_planned',
    path jsonb not null,        -- Array [[x, y], [x, y], ...]
    color text default '#f5a623',
    width numeric default 3,
    objective_id uuid references public.objectives(id) on delete set null,
    created_by uuid references public.profiles(id) default auth.uid(),
    created_at timestamptz not null default now()
);

create index idx_routes_kind on public.routes(kind);

alter table public.routes enable row level security;

-- 3. Políticas de RLS para Objetivos
create policy "Membros aprovados leem objetivos"
  on public.objectives
  for select
  using (public.is_approved_member());

create policy "Officers e admins criam objetivos"
  on public.objectives
  for insert
  with check (public.is_officer());

create policy "Officers e admins atualizam objetivos"
  on public.objectives
  for update
  using (public.is_officer())
  with check (public.is_officer());

create policy "Apenas admins deletam objetivos"
  on public.objectives
  for delete
  using (public.is_admin());

-- 4. Políticas de RLS para Rotas
create policy "Membros aprovados leem rotas"
  on public.routes
  for select
  using (public.is_approved_member());

create policy "Membros aprovados criam rotas"
  on public.routes
  for insert
  with check (public.is_approved_member());

create policy "Criador ou officers atualizam rotas"
  on public.routes
  for update
  using (created_by = auth.uid() or public.is_officer())
  with check (created_by = auth.uid() or public.is_officer());

create policy "Criador ou admins deletam rotas"
  on public.routes
  for delete
  using (created_by = auth.uid() or public.is_admin());
