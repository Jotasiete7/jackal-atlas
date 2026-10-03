-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 009: REGRAS RESTRITAS DE ADMINISTRAÇÃO E REFINAMENTO
-- 1. Objetivos da guilda restritos a Administradores (criação e alteração)
-- 2. Topônimos (landmarks) restritos a Administradores
-- 3. Adição do tipo 'fauna' ao enum point_kind
-- ==============================================================================

-- 1. Adicionar tipo 'fauna' ao enum point_kind
alter type point_kind add value if not exists 'fauna';

-- 2. Restringir criação e atualização de objetivos da guilda exclusivamente a Admins
drop policy if exists "Officers e admins criam objetivos" on public.objectives;
drop policy if exists "Apenas admins criam objetivos" on public.objectives;

create policy "Apenas admins criam objetivos"
  on public.objectives
  for insert
  with check (public.is_admin());

drop policy if exists "Officers e admins atualizam objetivos" on public.objectives;
drop policy if exists "Apenas admins atualizam objetivos" on public.objectives;

create policy "Apenas admins atualizam objetivos"
  on public.objectives
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Restringir criação/edição de Topônimos (landmarks) exclusivamente a Admins
create or replace function public.check_landmark_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'landmark' and not public.is_admin() then
    raise exception 'Apenas administradores podem registrar ou editar topônimos no mapa.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_point_landmark_guard on public.points;
create trigger on_point_landmark_guard
  before insert or update on public.points
  for each row execute function public.check_landmark_admin_only();
