-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 007: CORREÇÃO CRÍTICA DO REGISTRO DE USUÁRIOS
-- Resolve o erro "Database error saving new user"
-- ==============================================================================

-- 1. Remover a política que continha "WITH CHECK (false)" que bloqueava o trigger
DROP POLICY IF EXISTS "Apenas o sistema insere perfis via trigger" ON public.profiles;
DROP POLICY IF EXISTS "Permitir insercao de perfil" ON public.profiles;

-- 2. Criar política de inserção permissiva para o trigger e criação de perfil
CREATE POLICY "Permitir insercao de perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- 3. Conceder permissão de execução nas funções utilitárias RLS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_officer() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_member() TO authenticated, anon;

-- 4. Recriar a função de gatilho handle_new_user com proteção contra erros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_discord_id text;
  v_count integer;
  v_initial_role public.app_role := 'pending';
BEGIN
  -- Extrair ID do Discord dos metadados OAuth
  v_discord_id := coalesce(
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'sub'
  );

  -- Se for o primeiro usuário registrado no banco, recebe admin automaticamente
  SELECT count(*) INTO v_count FROM public.profiles;
  IF v_count = 0 THEN
    v_initial_role := 'admin'::public.app_role;
  END IF;

  -- Inserir perfil
  INSERT INTO public.profiles (id, discord_id, role)
  VALUES (new.id, v_discord_id, v_initial_role)
  ON CONFLICT (id) DO UPDATE SET
    discord_id = coalesce(excluded.discord_id, public.profiles.discord_id),
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Nunca interrompe a criação do usuário no auth.users
    RAISE WARNING 'handle_new_user notice: %', SQLERRM;
    RETURN new;
END;
$$;

-- 5. Reconectar o gatilho em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Sincronizar usuários já existentes em auth.users para public.profiles como 'admin'
INSERT INTO public.profiles (id, discord_id, role)
SELECT 
  u.id, 
  coalesce(u.raw_user_meta_data->>'provider_id', u.raw_user_meta_data->>'sub'),
  'admin'::public.app_role
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET role = 'admin'::public.app_role;

-- 7. Consultar a tabela para verificar
SELECT id, discord_id, nick, role, created_at FROM public.profiles;
