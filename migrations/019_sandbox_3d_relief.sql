-- ==============================================================================
-- JACKAL ATLAS & SANDBOX 3D — MIGRAÇÃO 019: RELEVO TOPOGRÁFICO 3D (ROUND 2)
-- Armazena o estado oficial do relevo 3D e histórico de commits/snapshots
-- ==============================================================================

-- 1. Tabela do estado ativo de relevo do mapa
CREATE TABLE IF NOT EXISTS public.relief_state (
  id text PRIMARY KEY DEFAULT 'jackal_r2_main',
  version integer NOT NULL DEFAULT 1,
  resolution integer NOT NULL DEFAULT 128,
  scale_meters numeric NOT NULL DEFAULT 4.0,
  bounds jsonb NOT NULL DEFAULT '{"minX": -2048, "maxX": 2048, "minY": -2048, "maxY": 2048}'::jsonb,
  heightmap text NOT NULL,
  statemap text NOT NULL,
  stations jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabela de histórico de versões / snapshots do relevo
CREATE TABLE IF NOT EXISTS public.relief_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  message text NOT NULL,
  heightmap text NOT NULL,
  statemap text NOT NULL,
  stations jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  author uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_relief_commits_version ON public.relief_commits(version DESC);
CREATE INDEX IF NOT EXISTS idx_relief_commits_created_at ON public.relief_commits(created_at DESC);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.relief_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relief_commits ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso
-- Leitura pública para todos (anon e autenticado)
DROP POLICY IF EXISTS "Leitura publica do relevo" ON public.relief_state;
CREATE POLICY "Leitura publica do relevo"
  ON public.relief_state
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Leitura publica de commits do relevo" ON public.relief_commits;
CREATE POLICY "Leitura publica de commits do relevo"
  ON public.relief_commits
  FOR SELECT
  TO public
  USING (true);

-- Escrita restrita a Oficiais e Administradores (Jotasiete, Calvos, Mitchel)
DROP POLICY IF EXISTS "Oficiais e admins atualizam o relevo" ON public.relief_state;
CREATE POLICY "Oficiais e admins atualizam o relevo"
  ON public.relief_state
  FOR ALL
  TO authenticated
  USING (public.is_officer())
  WITH CHECK (public.is_officer());

DROP POLICY IF EXISTS "Oficiais e admins criam commits de relevo" ON public.relief_commits;
CREATE POLICY "Oficiais e admins criam commits de relevo"
  ON public.relief_commits
  FOR ALL
  TO authenticated
  USING (public.is_officer())
  WITH CHECK (public.is_officer());

-- 5. Publicação no Supabase Realtime para sincronização ao vivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'relief_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.relief_state;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END;
$$;
