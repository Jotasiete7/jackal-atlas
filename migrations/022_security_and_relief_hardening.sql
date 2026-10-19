-- ==============================================================================
-- JACKAL ATLAS & SANDBOX 3D — MIGRATION 022: SECURITY, PERMISSIONS & RELIEF V2 HARDENING
-- 1. Adds 'pillar' to public.point_kind enum so approved members can create 3D survey pillars.
-- 2. Upgrades public.relief_state and public.relief_commits to the V2 Chunked Topographic schema.
-- 3. Makes public.relief_commits strictly append-only for officers (immutable version backups).
-- 4. Protects confirmed official points and built routes from deletion or unconfirmation by
--    regular members or demoted ('pending') accounts.
-- 5. Extends check_landmark_admin_only to BEFORE DELETE so only admins can delete landmarks.
-- 6. Allows officers to reject/delete unconfirmed (pending) point_events.
-- ==============================================================================

-- 1. Ensure 'pillar' exists in point_kind enum
ALTER TYPE public.point_kind ADD VALUE IF NOT EXISTS 'pillar';

-- 2. Upgrade relief_state and relief_commits to V2 Chunked Topographic schema
ALTER TABLE public.relief_state
  ALTER COLUMN id SET DEFAULT 'main',
  ALTER COLUMN heightmap DROP NOT NULL,
  ALTER COLUMN statemap DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS tile_scale_m numeric NOT NULL DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS chunk_size integer NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS chunks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sheets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pins jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contours jsonb NOT NULL DEFAULT '{"minorInterval": 5, "majorInterval": 25}'::jsonb;

ALTER TABLE public.relief_commits
  ALTER COLUMN heightmap DROP NOT NULL,
  ALTER COLUMN statemap DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS tile_scale_m numeric NOT NULL DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS chunk_size integer NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS chunks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sheets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pins jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contours jsonb NOT NULL DEFAULT '{"minorInterval": 5, "majorInterval": 25}'::jsonb;

-- 3. Harden relief_commits RLS: Append-only history so no map version can ever be lost
DROP POLICY IF EXISTS "Oficiais e admins criam commits de relevo" ON public.relief_commits;
DROP POLICY IF EXISTS "Officers insert relief commits" ON public.relief_commits;
DROP POLICY IF EXISTS "Admins delete relief commits" ON public.relief_commits;

CREATE POLICY "Officers insert relief commits"
  ON public.relief_commits
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_officer());

CREATE POLICY "Admins delete relief commits"
  ON public.relief_commits
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. Extend check_landmark_admin_only trigger to also guard DELETE
CREATE OR REPLACE FUNCTION public.check_landmark_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    IF tg_op = 'DELETE' THEN
      RETURN old;
    END IF;
    RETURN new;
  END IF;

  IF tg_op = 'INSERT' THEN
    IF new.kind = 'landmark' THEN
      RAISE EXCEPTION 'Only administrators can add place names (landmarks) on the map.';
    END IF;
    RETURN new;
  END IF;

  IF tg_op = 'DELETE' THEN
    IF old.kind = 'landmark' THEN
      RAISE EXCEPTION 'Only administrators can delete place names (landmarks) on the map.';
    END IF;
    RETURN old;
  END IF;

  -- UPDATE: block turning a point into a landmark, or editing a landmark's content
  IF new.kind = 'landmark' OR old.kind = 'landmark' THEN
    IF (new.kind, new.name, new.x, new.y, new.z, new.faction, new.attrs, new.priority)
       IS DISTINCT FROM
       (old.kind, old.name, old.x, old.y, old.z, old.faction, old.attrs, old.priority) THEN
      RAISE EXCEPTION 'Only administrators can edit place names (landmarks) on the map.';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_point_landmark_guard ON public.points;
CREATE TRIGGER on_point_landmark_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.points
  FOR EACH ROW EXECUTE FUNCTION public.check_landmark_admin_only();

-- 5. Harden points UPDATE & DELETE policies:
--    - Only approved members can manage their own UNCONFIRMED (pending) points.
--    - Once a point is confirmed (official map), only Officers and Admins can edit or delete it.
DROP POLICY IF EXISTS "Admins, officers e criador atualizam pontos" ON public.points;
CREATE POLICY "Admins, officers e criador atualizam pontos"
  ON public.points
  FOR UPDATE
  TO public
  USING (
    public.is_officer()
    OR (public.is_approved_member() AND auth.uid() = created_by AND confirmed = false)
  )
  WITH CHECK (
    public.is_officer()
    OR (public.is_approved_member() AND auth.uid() = created_by AND confirmed = false)
  );

DROP POLICY IF EXISTS "Admins, officers e criador deletam pontos" ON public.points;
CREATE POLICY "Admins, officers e criador deletam pontos"
  ON public.points
  FOR DELETE
  TO public
  USING (
    public.is_officer()
    OR (public.is_approved_member() AND auth.uid() = created_by AND confirmed = false)
  );

-- 6. Harden routes INSERT, UPDATE & DELETE policies:
--    - Rate limit route creation for non-officers (max 20/hour).
--    - Creators (if still approved members) can only edit/delete their own PLANNED routes.
--    - Validated/built routes ('road_built', 'bridge_built') can only be modified or deleted by Officers/Admins.
DROP POLICY IF EXISTS "Membros aprovados criam rotas" ON public.routes;
CREATE POLICY "Membros aprovados criam rotas"
  ON public.routes
  FOR INSERT
  TO public
  WITH CHECK (
    public.is_approved_member()
    AND (
      public.is_officer()
      OR (
        SELECT count(*)
        FROM public.routes r
        WHERE r.created_by = auth.uid()
          AND r.created_at > (now() - interval '1 hour')
      ) < 20
    )
  );

DROP POLICY IF EXISTS "Criador ou officers atualizam rotas" ON public.routes;
CREATE POLICY "Criador ou officers atualizam rotas"
  ON public.routes
  FOR UPDATE
  TO public
  USING (
    public.is_officer()
    OR (
      public.is_approved_member()
      AND created_by = auth.uid()
      AND kind IN ('patrol', 'expedition', 'road_planned', 'bridge_planned')
    )
  )
  WITH CHECK (
    public.is_officer()
    OR (
      public.is_approved_member()
      AND created_by = auth.uid()
      AND kind IN ('patrol', 'expedition', 'road_planned', 'bridge_planned')
    )
  );

DROP POLICY IF EXISTS "Criador ou admins deletam rotas" ON public.routes;
CREATE POLICY "Criador ou officers deletam rotas"
  ON public.routes
  FOR DELETE
  TO public
  USING (
    public.is_officer()
    OR (
      public.is_approved_member()
      AND created_by = auth.uid()
      AND kind IN ('patrol', 'expedition', 'road_planned', 'bridge_planned')
    )
  );

-- 7. Allow Officers to reject (delete) unconfirmed point_events in the moderation queue,
--    while keeping confirmed historical events deletable only by Admins.
DROP POLICY IF EXISTS "Apenas administradores deletam eventos" ON public.point_events;
CREATE POLICY "Admins deletam eventos ou officers rejeitam pendentes"
  ON public.point_events
  FOR DELETE
  TO public
  USING (
    public.is_admin()
    OR (public.is_officer() AND confirmed = false)
  );
