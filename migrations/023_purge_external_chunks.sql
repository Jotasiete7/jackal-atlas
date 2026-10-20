-- ==============================================================================
-- JACKAL ATLAS & SANDBOX 3D — SCRIPT DE LIMPEZA DIRETA DE CHUNKS EXTERNOS
-- Remove permanentemente os chunks fantasmas da nuvem que estavam fora do círculo:
-- Chunk (-2, 0) com 899 células ativas e Chunk (-2, -1) com 1229 células ativas.
-- ==============================================================================

-- 1. Backup de segurança imediato na tabela append-only relief_commits antes de expurgar
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
  metadata,
  author
)
SELECT
  version,
  'Backup de segurança pré-limpeza SQL de chunks externos v' || version,
  heightmap,
  statemap,
  tile_scale_m,
  chunk_size,
  chunks,
  sheets,
  pins,
  stations,
  metadata,
  updated_by
FROM public.relief_state
WHERE id = 'jackal_r2_main';

-- 2. Limpeza dos chunks (-2, 0) e (-2, -1) do estado oficial ativo
UPDATE public.relief_state
SET
  version = version + 1,
  chunks = (
    SELECT jsonb_agg(c)
    FROM jsonb_array_elements(chunks) AS c
    WHERE NOT ((c->>'chunkX')::int = -2 AND (c->>'chunkY')::int IN (0, -1))
  ),
  heightmap = json_build_object(
    'chunks',
    (
      SELECT jsonb_agg(c)
      FROM jsonb_array_elements(chunks) AS c
      WHERE NOT ((c->>'chunkX')::int = -2 AND (c->>'chunkY')::int IN (0, -1))
    )
  )::text,
  updated_at = now(),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{commit_message}',
    to_jsonb('Limpeza SQL oficial de chunks externos · v00' || (version + 1)::text)
  )
WHERE id = 'jackal_r2_main';

-- 3. Confirmação do resultado pós-limpeza
SELECT
  id,
  version,
  updated_at,
  jsonb_array_length(chunks) AS total_chunks,
  metadata->>'commit_message' AS mensagem
FROM public.relief_state
WHERE id = 'jackal_r2_main';
