-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 007: CORREÇÃO DE PERMISSÕES E PROMOÇÃO DE ADMIN
-- ==============================================================================

-- 1. Conceder permissão de execução nas funções de verificação para o role 'authenticated'
-- (Necessário para que o Postgres consiga avaliar as políticas de RLS dos usuários logados)
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_officer() to authenticated;
grant execute on function public.is_approved_member() to authenticated;

-- 2. Vincular e promover automaticamente os usuários do Discord existentes para 'admin'
insert into public.profiles (id, discord_id, role)
select 
  u.id, 
  coalesce(u.raw_user_meta_data->>'provider_id', u.raw_user_meta_data->>'sub'),
  'admin'::app_role
from auth.users u
on conflict (id) do update set role = 'admin'::app_role;

-- 3. Visualizar os perfis atuais
select id, discord_id, nick, role, created_at from public.profiles;
