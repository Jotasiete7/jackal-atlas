-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 010: PATCHES DE SEGURANÇA E ACESSO PÚBLICO
-- 1. Leitura pública de pontos confirmados e rotas para visitantes
-- 2. Bloqueio anti-escalação de 'confirmed' via UPDATE por membros comuns
-- 3. Re-moderação automática caso o autor edite o conteúdo de um ponto já aprovado
-- ==============================================================================

-- 1. Leitura pública de pontos confirmados (Visitantes e Jogadores Externos)
-- Permite que qualquer visitante veja pontos aprovados no mapa oficial.
-- Membros logados continuam vendo também suas próprias propostas pendentes.
-- Oficiais e Administradores continuam vendo todos os pontos (inclusive a fila de pendentes).
DROP POLICY IF EXISTS "Membros leem pontos confirmados ou seus proprios; officers leem tudo" ON public.points;
DROP POLICY IF EXISTS "Leitura publica de pontos confirmados" ON public.points;

CREATE POLICY "Leitura publica de pontos confirmados"
  ON public.points
  FOR SELECT
  USING (
    confirmed = true
    OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
    OR public.is_officer()
  );

-- 2. Leitura pública de rotas e infraestrutura do mapa
DROP POLICY IF EXISTS "Membros aprovados leem rotas" ON public.routes;
DROP POLICY IF EXISTS "Leitura publica de rotas" ON public.routes;

CREATE POLICY "Leitura publica de rotas"
  ON public.routes
  FOR SELECT
  USING (true);

-- 3. Gatilho de Proteção contra Auto-Aprovação via UPDATE
-- Impede que membros comuns alterem o booleano 'confirmed' diretamente.
-- Se o autor de um ponto alterar o conteúdo de um ponto já aprovado, ele retorna para re-avaliação.
CREATE OR REPLACE FUNCTION public.guard_point_confirmation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o campo 'confirmed' estiver sendo alterado e não for Oficial/Admin:
  IF (NEW.confirmed <> OLD.confirmed) AND NOT public.is_officer() THEN
    RAISE EXCEPTION 'Apenas Oficiais e Administradores têm permissão para aprovar ou alterar o status de confirmação de pontos.';
  END IF;

  -- Se um membro comum editar as informações (nome, tipo, coordenadas) de um ponto já confirmado:
  -- O ponto retorna ao estado pendente para que oficiais validem a nova alteração.
  IF (OLD.confirmed = true) AND NOT public.is_officer() AND (auth.uid() = OLD.created_by) THEN
    NEW.confirmed := false;
    NEW.confirmed_by := null;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_point_confirmation_guard ON public.points;
CREATE TRIGGER on_point_confirmation_guard
  BEFORE UPDATE ON public.points
  FOR EACH ROW EXECUTE FUNCTION public.guard_point_confirmation_update();
