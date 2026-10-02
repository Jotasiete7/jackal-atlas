-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 003: PONTOS DE INTERESSE E EVENT-SOURCING
-- Beacons, Cavernas, Lodestones, Recursos e Histórico de Guerra
-- ==============================================================================

-- 1. Enums do sistema tático
create type point_kind as enum (
  'beacon',
  'lodestone',
  'tower',
  'village',
  'cave',
  'resource_node',
  'idol',
  'idol_plinth',
  'supply_point',
  'landmark',
  'altar',
  'safe_space'
);

create type faction as enum ('freedom', 'jackal', 'neutral', 'unknown');

create type point_status as enum ('active', 'under_attack', 'destroyed', 'unknown');

create type event_type as enum (
  'discovered',
  'cleared',
  'converted_freedom',
  'reinforced',
  'attacked',
  'lost',
  'rebuilt',
  'idol_found',
  'idol_claimed',
  'idol_used',
  'verified',
  'note'
);

create type priority_level as enum ('p1', 'p2', 'p3');

-- 2. Tabela de Pontos de Interesse (Estado Atual Derivado)
create table public.points (
    id uuid primary key default gen_random_uuid(),
    kind point_kind not null,
    name text,
    x numeric not null,
    y numeric not null,
    z numeric,
    faction faction not null default 'unknown',
    status point_status not null default 'unknown',
    reinforcement smallint default 0 check (reinforcement between 0 and 2),
    confirmed boolean not null default false,
    confirmed_by uuid references public.profiles(id),
    created_by uuid references public.profiles(id),
    priority priority_level,
    attrs jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_reinforcement_beacon check (reinforcement is null or reinforcement = 0 or kind = 'beacon')
);

create index idx_points_coords on public.points(x, y);
create index idx_points_kind on public.points(kind);
create index idx_points_faction on public.points(faction);
create index idx_points_confirmed on public.points(confirmed);

alter table public.points enable row level security;

-- 3. Tabela de Eventos (Event-Sourced Ledger)
create table public.point_events (
    id uuid primary key default gen_random_uuid(),
    point_id uuid not null references public.points(id) on delete cascade,
    event_type event_type not null,
    actor_id uuid references public.profiles(id),
    payload jsonb not null default '{}'::jsonb,
    confirmed boolean not null default false,
    confirmed_by uuid references public.profiles(id),
    created_at timestamptz not null default now()
);

create index idx_point_events_point_id on public.point_events(point_id);
create index idx_point_events_confirmed on public.point_events(confirmed);
create index idx_point_events_created_at on public.point_events(created_at desc);

alter table public.point_events enable row level security;

-- 4. Função de Gatilho: Atualizar Estado do Ponto ao Confirmar/Inserir Evento
create or replace function public.apply_point_event_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_point public.points%rowtype;
begin
  -- Se o evento não estiver confirmado, não altera o estado canônico do mapa
  if not new.confirmed then
    return new;
  end if;

  select * into v_point from public.points where id = new.point_id;
  if not found then
    return new;
  end if;

  -- Se o evento foi confirmado e o ponto pai ainda não era, confirma o ponto
  if not v_point.confirmed then
    update public.points 
    set confirmed = true, confirmed_by = coalesce(new.confirmed_by, auth.uid()), updated_at = now()
    where id = new.point_id;
  end if;

  -- Transições de Estado Conforme os Fatos do Jogo Jackal
  case new.event_type
    when 'cleared' then
      update public.points
      set faction = 'neutral', status = 'active', updated_at = now()
      where id = new.point_id;

    when 'converted_freedom' then
      update public.points
      set faction = 'freedom', status = 'active', reinforcement = 0, updated_at = now()
      where id = new.point_id;

    when 'reinforced' then
      update public.points
      set reinforcement = least(2, coalesce(v_point.reinforcement, 0) + 1), updated_at = now()
      where id = new.point_id and kind = 'beacon';

    when 'attacked' then
      update public.points
      set status = 'under_attack', updated_at = now()
      where id = new.point_id;

    when 'lost' then
      update public.points
      set faction = 'jackal', status = 'active', reinforcement = 0, updated_at = now()
      where id = new.point_id;

    when 'rebuilt' then
      update public.points
      set faction = 'freedom', status = 'active', reinforcement = 0, updated_at = now()
      where id = new.point_id;

    when 'verified' then
      update public.points
      set confirmed = true, confirmed_by = coalesce(new.confirmed_by, auth.uid()), updated_at = now()
      where id = new.point_id;

    else
      -- Outros eventos como 'note', 'idol_found' apenas gravam histórico
      null;
  end case;

  return new;
end;
$$;

create or replace trigger on_point_event_applied
  after insert or update of confirmed on public.point_events
  for each row execute function public.apply_point_event_state();

-- 5. Regras de Inserção Automática de Confirmação para Officers/Admins
create or replace function public.pre_process_point_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  -- Officers e Admins já têm seus envios aprovados automaticamente
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

create or replace trigger on_point_insert_guard
  before insert on public.points
  for each row execute function public.pre_process_point_submission();

create or replace function public.pre_process_event_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.actor_id := auth.uid();
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

create or replace trigger on_event_insert_guard
  before insert on public.point_events
  for each row execute function public.pre_process_event_submission();

-- 6. Políticas de RLS
-- POINTS
create policy "Membros leem pontos confirmados ou seus proprios; officers leem tudo"
  on public.points
  for select
  using (
    public.is_approved_member() and (
      confirmed = true
      or created_by = auth.uid()
      or public.is_officer()
    )
  );

create policy "Membros aprovados podem sugerir pontos"
  on public.points
  for insert
  with check (public.is_approved_member());

create policy "Apenas officers e admins atualizam ou excluem pontos"
  on public.points
  for update
  using (public.is_officer())
  with check (public.is_officer());

create policy "Apenas administradores deletam pontos"
  on public.points
  for delete
  using (public.is_admin());

-- POINT EVENTS
create policy "Membros leem eventos confirmados ou seus proprios; officers leem tudo"
  on public.point_events
  for select
  using (
    public.is_approved_member() and (
      confirmed = true
      or actor_id = auth.uid()
      or public.is_officer()
    )
  );

create policy "Membros aprovados registram eventos"
  on public.point_events
  for insert
  with check (public.is_approved_member());

create policy "Apenas officers e admins atualizam eventos (aprovar/rejeitar)"
  on public.point_events
  for update
  using (public.is_officer())
  with check (public.is_officer());

create policy "Apenas administradores deletam eventos"
  on public.point_events
  for delete
  using (public.is_admin());
