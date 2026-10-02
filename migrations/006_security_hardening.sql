-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 006: HARDENING DE SEGURANÇA
-- Aplica correções identificadas na análise de segurança de 02/10/2026
-- Rodar APÓS as migrations 001-005
-- ==============================================================================

-- 1. Política DELETE explícita em profiles (antes bloqueado implicitamente por ausência)
create policy "Apenas admins deletam perfis"
  on public.profiles
  for delete
  using (public.is_admin());

-- 2. Bloquear INSERT direto em profiles (apenas o trigger handle_new_user pode inserir)
create policy "Apenas o sistema insere perfis via trigger"
  on public.profiles
  for insert
  with check (false);

-- 3. Revogar execução pública das funções utilitárias (usadas apenas internamente pelo Postgres/RLS)
revoke execute on function public.is_admin() from anon, authenticated;
revoke execute on function public.is_officer() from anon, authenticated;
revoke execute on function public.is_approved_member() from anon, authenticated;

-- 4. Constraint de faixa geográfica nas coordenadas de pontos (0–4096 = mapa Wurm completo)
alter table public.points
  add constraint chk_coords_range
    check (x >= 0 and x <= 4096 and y >= 0 and y <= 4096);

-- Permitir z = null ou no range razoável para cavernas
alter table public.points
  add constraint chk_z_range
    check (z is null or (z >= -200 and z <= 200));

-- 5. Constraint de tamanho máximo para o campo attrs (previne payloads gigantes)
alter table public.points
  add constraint chk_attrs_size
    check (length(attrs::text) < 4096);

-- 6. Constraint de tamanho em payload de eventos
alter table public.point_events
  add constraint chk_event_payload_size
    check (length(payload::text) < 2048);

-- 7. Rate limit de inserção de pontos: máximo 20 pontos por membro por hora
--    (Officers e Admins são isentos — is_officer() retorna true para ambos)
drop policy if exists "Membros aprovados podem sugerir pontos" on public.points;

create policy "Membros aprovados podem sugerir pontos com rate limit"
  on public.points
  for insert
  with check (
    public.is_approved_member() and (
      public.is_officer()  -- Officers/Admins sem limite
      or (
        select count(*) from public.points
        where created_by = auth.uid()
          and created_at > now() - interval '1 hour'
      ) < 20
    )
  );

-- 8. Rate limit de eventos: máximo 50 eventos por membro por hora
drop policy if exists "Membros aprovados registram eventos" on public.point_events;

create policy "Membros aprovados registram eventos com rate limit"
  on public.point_events
  for insert
  with check (
    public.is_approved_member() and (
      public.is_officer()
      or (
        select count(*) from public.point_events
        where actor_id = auth.uid()
          and created_at > now() - interval '1 hour'
      ) < 50
    )
  );

-- ==============================================================================
-- NOTA: A lógica de "primeiro usuário se torna admin automaticamente" no trigger
-- handle_new_user() deve ser revisada manualmente após o deploy. Recomenda-se:
--   1. Desativar a lógica automática (comentar as linhas 87-91 de 001_base_schema.sql)
--   2. Após o primeiro usuário se cadastrar com role='pending', promovê-lo manualmente:
--      UPDATE public.profiles SET role = 'admin' WHERE discord_id = 'SEU_DISCORD_ID';
-- ==============================================================================
