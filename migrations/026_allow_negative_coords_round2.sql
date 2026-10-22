-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 026: SUPORTE A COORDENADAS NEGATIVAS NO ROUND 2
-- O sistema de coordenadas do Round 2 usa o Spawn como origem (0, 0),
-- permitindo coordenadas negativas (ex: West em -320, -250 e East em 60, -180).
-- A restrição chk_coords_range anterior bloqueava valores < 0 (x >= 0 and y >= 0).
-- Esta migração expande a restrição para permitir [-4096, 4096] em ambos os eixos.
-- ==============================================================================

ALTER TABLE public.points
  DROP CONSTRAINT IF EXISTS chk_coords_range;

ALTER TABLE public.points
  ADD CONSTRAINT chk_coords_range
  CHECK (x >= -4096 AND x <= 4096 AND y >= -4096 AND y <= 4096);
