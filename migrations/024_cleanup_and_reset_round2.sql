-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 024: LIMPEZA E RESET OFICIAL (JACKAL ROUND 2)
-- 1. Limpa traços de esboço e rotas de teste
-- 2. Limpa histórico de commits de teste do relevo e reseta para Versão 1 Oficial
-- 3. Cadastra os 3 Cristais Oficiais calibrados (Norte, Oeste, Sul)
-- ==============================================================================

-- 1. Limpeza de rotas de teste e rascunhos de esboço
TRUNCATE TABLE public.sketch_strokes, public.sketch_commits CASCADE;
TRUNCATE TABLE public.routes CASCADE;
DELETE FROM public.points WHERE kind <> 'landmark';
DELETE FROM public.point_events;

-- 2. Limpeza de histórico de commits de teste do relevo
TRUNCATE TABLE public.relief_commits CASCADE;

-- 3. Reset do estado de relevo para Versão 1 Oficial
UPDATE public.relief_state
SET 
  version = 1,
  metadata = jsonb_build_object(
    'author', 'Oficial',
    'commit_message', 'Relevo Oficial v1 (Lançamento Round 2)'
  ),
  stations = jsonb_build_array(
    jsonb_build_object(
      'id', 'crystal_north',
      'station_x', 0,
      'station_y', 150,
      'heading_deg', 0,
      'station_method', 'marco_construido',
      'author', 'Cristal Norte',
      'range_tiles', 100,
      'date', CURRENT_DATE::text
    ),
    jsonb_build_object(
      'id', 'crystal_west',
      'station_x', -320,
      'station_y', -250,
      'heading_deg', 0,
      'station_method', 'marco_construido',
      'author', 'Cristal Oeste',
      'range_tiles', 100,
      'date', CURRENT_DATE::text
    ),
    jsonb_build_object(
      'id', 'crystal_south',
      'station_x', 60,
      'station_y', -180,
      'heading_deg', 0,
      'station_method', 'marco_construido',
      'author', 'Cristal Sul',
      'range_tiles', 100,
      'date', CURRENT_DATE::text
    )
  ),
  updated_at = now()
WHERE id = 'jackal_r2_main';

-- 4. Grava o commit inicial v1 oficial no histórico imutável
INSERT INTO public.relief_commits (
  version,
  message,
  heightmap,
  statemap,
  tile_scale_m,
  chunk_size,
  chunks,
  sheets,
  pins,
  stations,
  metadata
)
SELECT 
  1,
  'Relevo Oficial v1 (Lançamento Round 2)',
  heightmap,
  statemap,
  tile_scale_m,
  chunk_size,
  chunks,
  sheets,
  pins,
  stations,
  metadata
FROM public.relief_state
WHERE id = 'jackal_r2_main';
