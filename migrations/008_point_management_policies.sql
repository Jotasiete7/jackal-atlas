-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 008: POLÍTICAS DE EDIÇÃO E EXCLUSÃO DE PONTOS
-- Permite que Admins, Officers e o Autor do Ponto possam editar e excluir
-- ==============================================================================

-- 1. Atualização de Pontos (Admin, Officer ou próprio autor)
drop policy if exists "Apenas officers e admins atualizam ou excluem pontos" on public.points;
drop policy if exists "Admins, officers e criador atualizam pontos" on public.points;

create policy "Admins, officers e criador atualizam pontos"
  on public.points
  for update
  using (public.is_admin() or public.is_officer() or auth.uid() = created_by)
  with check (public.is_admin() or public.is_officer() or auth.uid() = created_by);

-- 2. Exclusão de Pontos (Admin, Officer ou próprio autor)
drop policy if exists "Apenas administradores deletam pontos" on public.points;
drop policy if exists "Admins, officers e criador deletam pontos" on public.points;

create policy "Admins, officers e criador deletam pontos"
  on public.points
  for delete
  using (public.is_admin() or public.is_officer() or auth.uid() = created_by);
