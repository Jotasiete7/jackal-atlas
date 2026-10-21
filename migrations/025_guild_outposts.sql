-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 025: VÍNCULO DE GUILDAS/TEAMS COM CRISTAIS/OUTPOSTS
-- Permite que cada guilda seja atribuída a um dos 3 postos avançados oficiais
-- (North, West ou East). O 3D Sandbox e o Atlas 2D usam isso para inicializar
-- a câmera e a estação de trabalho diretamente no posto do time do jogador.
-- ==============================================================================

-- 1. Adiciona coluna outpost na tabela guilds (com valor padrão 'east' para novos times)
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS outpost text NOT NULL DEFAULT 'east';

-- 2. Restrição de valores permitidos: apenas os 3 postos oficiais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_guilds_outpost'
  ) THEN
    ALTER TABLE public.guilds
      ADD CONSTRAINT chk_guilds_outpost
      CHECK (outpost IN ('north', 'west', 'east'));
  END IF;
END $$;

-- 3. Atualiza automaticamente guildas existentes
-- Team EET -> Freedom Outpost East
UPDATE public.guilds
SET outpost = 'east'
WHERE tag ILIKE '%EET%' OR name ILIKE '%EET%' OR name ILIKE '%East%' OR name ILIKE '%Leste%';

-- Outras guildas com indicação de Norte ou Oeste
UPDATE public.guilds
SET outpost = 'north'
WHERE (tag ILIKE '%NOR%' OR name ILIKE '%North%' OR name ILIKE '%Norte%') AND outpost <> 'north';

UPDATE public.guilds
SET outpost = 'west'
WHERE (tag ILIKE '%WES%' OR name ILIKE '%West%' OR name ILIKE '%Oeste%') AND outpost <> 'west';

-- 4. Notificação de realtime já está habilitada para a tabela guilds (migração 017)
