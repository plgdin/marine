-- =============================================================================
-- MARINE TRACK — Core Database Schema (Production)
-- Migration: 20260522000000_core_schema.sql
--
-- Architecture: Supabase modular monolith with PostGIS.
-- This migration creates all tables, types, indexes, and publications.
-- A separate migration handles RLS policies.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- PostGIS is managed by Supabase under the `extensions` schema.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CUSTOM ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TYPE public.vessel_status AS ENUM ('active', 'inactive', 'maintenance');

CREATE TYPE public.nav_status AS ENUM (
    'underway_using_engine',
    'at_anchor',
    'not_under_command',
    'restricted_manoeuvrability',
    'constrained_by_draught',
    'moored',
    'aground',
    'engaged_in_fishing',
    'underway_sailing',
    'reserved_hsc',
    'reserved_wig',
    'power_driven_vessel_towing_astern',
    'power_driven_vessel_pushing_ahead',
    'reserved_for_future_use',
    'ais_sart',
    'undefined'
);

CREATE TYPE public.geofence_type AS ENUM ('port', 'anchorage', 'custom');


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MULTI-TENANCY & AUTH
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. Organizations
CREATE TABLE public.organizations (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT            NOT NULL,
    slug        TEXT            NOT NULL UNIQUE,
    settings    JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS 'Top-level tenant. All data is scoped to an organization.';

-- Slug lookups
CREATE UNIQUE INDEX idx_organizations_slug ON public.organizations (slug);


-- 3b. Organization Members (RBAC join table)
CREATE TABLE public.org_members (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id     UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        public.org_role NOT NULL DEFAULT 'viewer',
    joined_at   TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_org_members_org_user UNIQUE (org_id, user_id)
);

COMMENT ON TABLE public.org_members IS 'Links auth.users to organizations with an RBAC role.';

-- Fast lookups: "which orgs does this user belong to?"
CREATE INDEX idx_org_members_user_id ON public.org_members (user_id);
-- Fast lookups: "who is in this org?"
CREATE INDEX idx_org_members_org_id  ON public.org_members (org_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ASSETS — VESSELS, FLEETS
-- ─────────────────────────────────────────────────────────────────────────────

-- 4a. Vessels
CREATE TABLE public.vessels (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    mmsi            TEXT,
    imo             TEXT,
    name            TEXT            NOT NULL,
    vessel_type     TEXT            NOT NULL,
    call_sign       TEXT,
    flag_country    TEXT,
    length_overall  NUMERIC,
    beam            NUMERIC,
    draught         NUMERIC,
    gross_tonnage   INTEGER,
    deadweight      INTEGER,
    year_built      INTEGER,
    status          public.vessel_status NOT NULL DEFAULT 'active',
    metadata        JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vessels IS 'Core ship metadata. Every vessel belongs to exactly one organization.';

-- MMSI / IMO must be unique within an org
CREATE UNIQUE INDEX idx_vessels_org_mmsi ON public.vessels (org_id, mmsi) WHERE mmsi IS NOT NULL;
CREATE UNIQUE INDEX idx_vessels_org_imo  ON public.vessels (org_id, imo)  WHERE imo  IS NOT NULL;
-- Org-scoped listing
CREATE INDEX idx_vessels_org_id ON public.vessels (org_id);


-- 4b. Fleets
CREATE TABLE public.fleets (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name        TEXT            NOT NULL,
    description TEXT,
    color       TEXT            DEFAULT '#3B82F6',
    icon        TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fleets IS 'Logical groupings of vessels within an organization.';

CREATE INDEX idx_fleets_org_id ON public.fleets (org_id);


-- 4c. Fleet ↔ Vessel (Many-to-Many)
-- Carries org_id so RLS can enforce tenant isolation without a JOIN.
CREATE TABLE public.fleet_vessels (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id    UUID            NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
    vessel_id   UUID            NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
    org_id      UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_fleet_vessels_fleet_vessel UNIQUE (fleet_id, vessel_id)
);

COMMENT ON TABLE public.fleet_vessels IS 'Many-to-many mapping between fleets and vessels. Denormalized org_id for O(1) RLS.';

CREATE INDEX idx_fleet_vessels_fleet_id  ON public.fleet_vessels (fleet_id);
CREATE INDEX idx_fleet_vessels_vessel_id ON public.fleet_vessels (vessel_id);
CREATE INDEX idx_fleet_vessels_org_id    ON public.fleet_vessels (org_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. REAL-TIME TRACKING (CRITICAL ARCHITECTURE SPLIT)
--
-- Two tables, two purposes:
--   • vessel_latest_positions — hot, single-row-per-vessel, Supabase Realtime
--   • vessel_position_history — cold, append-only, analytics & voyage playback
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. Latest Positions (live map layer)
--     Primary key IS the vessel_id — exactly one row per vessel.
--     This table is UPSERTed on every incoming AIS ping.
CREATE TABLE public.vessel_latest_positions (
    vessel_id       UUID            PRIMARY KEY REFERENCES public.vessels(id) ON DELETE CASCADE,
    org_id          UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location        extensions.GEOGRAPHY(POINT, 4326) NOT NULL,
    heading         NUMERIC,        -- degrees 0–359.9
    course          NUMERIC,        -- COG in degrees
    speed           NUMERIC,        -- SOG in knots
    nav_status      public.nav_status DEFAULT 'undefined',
    timestamp       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    source          TEXT            NOT NULL DEFAULT 'ais'
);

COMMENT ON TABLE public.vessel_latest_positions IS
    'Single-row-per-vessel hot table. UPSERTed on every AIS ping. '
    'Subscribed to via Supabase Realtime for the live map.';

-- Org-scoped listing for the map query: SELECT * WHERE org_id = $1
CREATE INDEX idx_vlp_org_id    ON public.vessel_latest_positions (org_id);
-- Spatial index for proximity / bounding-box queries on the latest positions
CREATE INDEX idx_vlp_location  ON public.vessel_latest_positions USING GIST (location);


-- 5b. Position History (voyage playback & analytics)
--     Append-only. Never updated, never deleted by the application.
CREATE TABLE public.vessel_position_history (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id       UUID            NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
    org_id          UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location        extensions.GEOGRAPHY(POINT, 4326) NOT NULL,
    heading         NUMERIC,
    course          NUMERIC,
    speed           NUMERIC,
    nav_status      public.nav_status DEFAULT 'undefined',
    timestamp       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    source          TEXT            NOT NULL DEFAULT 'ais'
);

COMMENT ON TABLE public.vessel_position_history IS
    'Append-only historical track log for voyage playback and analytics. '
    'Never mutated by the application layer.';

-- GiST index on location for spatial analytics (corridor queries, heatmaps)
CREATE INDEX idx_vph_location  ON public.vessel_position_history USING GIST (location);
-- B-Tree on timestamp for time-range slicing (voyage playback)
CREATE INDEX idx_vph_timestamp ON public.vessel_position_history (timestamp DESC);
-- Composite: fetch a single vessel's track over a date range
CREATE INDEX idx_vph_vessel_time ON public.vessel_position_history (vessel_id, timestamp DESC);
-- Org-scoped queries
CREATE INDEX idx_vph_org_id    ON public.vessel_position_history (org_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SPATIAL GEOFENCING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.geofences (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name        TEXT            NOT NULL,
    description TEXT,
    type        public.geofence_type NOT NULL DEFAULT 'custom',
    polygon     extensions.GEOGRAPHY(POLYGON, 4326) NOT NULL,
    is_active   BOOLEAN         NOT NULL DEFAULT true,
    metadata    JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.geofences IS 'Spatial polygons for port, anchorage, and custom zone geofencing.';

-- GiST index on polygon for ST_Intersects / ST_Contains queries
CREATE INDEX idx_geofences_polygon ON public.geofences USING GIST (polygon);
-- Org-scoped listing
CREATE INDEX idx_geofences_org_id  ON public.geofences (org_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 7a. updated_at auto-timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vessels_updated_at
    BEFORE UPDATE ON public.vessels
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- 7b. Supabase Auth — Custom Access Token Hook
-- Enriches the JWT with the user's primary org_id and role so that
-- RLS helper functions can operate in O(1) without hitting org_members.
--
-- After deploying, run:
--   GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
--   REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
-- Then enable the hook in Dashboard → Authentication → Hooks.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims      jsonb;
    user_role   public.org_role;
    user_org_id uuid;
BEGIN
    -- Fetch the user's primary membership (deterministic: ordered by joined_at)
    SELECT om.org_id, om.role
      INTO user_org_id, user_role
      FROM public.org_members om
     WHERE om.user_id = (event->>'user_id')::uuid
     ORDER BY om.joined_at ASC
     LIMIT 1;

    claims := event->'claims';

    IF user_org_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, org_id}', to_jsonb(user_org_id));
        claims := jsonb_set(claims, '{app_metadata, role}',   to_jsonb(user_role));
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SUPABASE REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Supabase Realtime ONLY on the latest-positions table.
-- The history table is append-only and does not need realtime subscriptions.
ALTER PUBLICATION supabase_realtime ADD TABLE public.vessel_latest_positions;


-- =============================================================================
-- END OF CORE SCHEMA
-- =============================================================================
-- =============================================================================
-- MARINE TRACK — Row Level Security Policies (Production)
-- Migration: 20260522000001_rls_policies.sql
--
-- NON-NEGOTIABLE RULES:
--   1. RLS is ENABLED on every single table.
--   2. Every policy gates on org_id matching the user's org memberships.
--   3. Write operations require appropriate roles.
--   4. No tenant data bleed is possible.
--
-- STRATEGY:
--   We provide two helper functions:
--     • auth_org_id()  — Reads the org_id from the JWT (O(1), set by the
--                         custom_access_token_hook). This is the fast path.
--     • auth_org_ids() — Subquery fallback that returns ALL org_ids for the
--                         authenticated user from org_members. Used where we
--                         cannot trust a single-org JWT (e.g. multi-org users).
--
--   All policies use auth_org_ids() for correctness. If you have confirmed
--   single-org-per-user semantics, you may swap to auth_org_id() for speed.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 0. ENABLE RLS ON EVERY TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessels                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleets                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vessels              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_latest_positions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_position_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences                  ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RLS HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Fast-path: single org_id from JWT app_metadata (O(1))
CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'org_id',
        ''
    )::uuid;
$$;

-- 1b. Fast-path: role from JWT app_metadata (O(1))
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'role';
$$;

-- 1c. Subquery-based: all org_ids for the current user (correctness fallback)
--     Uses auth.uid() which Supabase injects automatically.
CREATE OR REPLACE FUNCTION public.auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT om.org_id
      FROM public.org_members om
     WHERE om.user_id = auth.uid();
$$;

-- 1d. Check if current user has a specific minimum role in a given org
CREATE OR REPLACE FUNCTION public.user_has_role_in_org(
    _org_id uuid,
    _allowed_roles public.org_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.org_members om
         WHERE om.user_id = auth.uid()
           AND om.org_id  = _org_id
           AND om.role    = ANY(_allowed_roles)
    );
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORGANIZATIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Users can only see orgs they are a member of.
CREATE POLICY "organizations_select_policy"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Any authenticated user can create an org (they become the owner).
CREATE POLICY "organizations_insert_policy"
    ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: Only owners and admins of the org can update it.
CREATE POLICY "organizations_update_policy"
    ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_role_in_org(id, ARRAY['owner', 'admin']::public.org_role[])
    )
    WITH CHECK (
        public.user_has_role_in_org(id, ARRAY['owner', 'admin']::public.org_role[])
    );

-- DELETE: Only the org owner can delete the entire organization.
CREATE POLICY "organizations_delete_policy"
    ON public.organizations
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role_in_org(id, ARRAY['owner']::public.org_role[])
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ORG MEMBERS
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Members can see other members of their own org.
CREATE POLICY "org_members_select_policy"
    ON public.org_members
    FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Only owners and admins can invite new members.
CREATE POLICY "org_members_insert_policy"
    ON public.org_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
    );

-- UPDATE: Only owners and admins can change member roles.
CREATE POLICY "org_members_update_policy"
    ON public.org_members
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
    )
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
    );

-- DELETE: Owners/admins can remove members. Users can remove themselves.
CREATE POLICY "org_members_delete_policy"
    ON public.org_members
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
        OR user_id = auth.uid()
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VESSELS
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Any org member can view their org's vessels.
CREATE POLICY "vessels_select_policy"
    ON public.vessels
    FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Owners, admins, and members can register new vessels.
CREATE POLICY "vessels_insert_policy"
    ON public.vessels
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- UPDATE: Owners, admins, and members can update vessel metadata.
CREATE POLICY "vessels_update_policy"
    ON public.vessels
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    )
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- DELETE: Only owners and admins can decommission (delete) a vessel.
CREATE POLICY "vessels_delete_policy"
    ON public.vessels
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FLEETS
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Any org member can view their org's fleets.
CREATE POLICY "fleets_select_policy"
    ON public.fleets
    FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Owners, admins, and members can create fleets.
CREATE POLICY "fleets_insert_policy"
    ON public.fleets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- UPDATE: Owners, admins, and members can update fleet details.
CREATE POLICY "fleets_update_policy"
    ON public.fleets
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    )
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- DELETE: Only owners and admins can delete fleets.
CREATE POLICY "fleets_delete_policy"
    ON public.fleets
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FLEET ↔ VESSEL (Many-to-Many)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Any org member can see fleet-vessel assignments in their org.
CREATE POLICY "fleet_vessels_select_policy"
    ON public.fleet_vessels
    FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Owners, admins, and members can assign vessels to fleets.
CREATE POLICY "fleet_vessels_insert_policy"
    ON public.fleet_vessels
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- DELETE: Owners, admins, and members can remove vessels from fleets.
CREATE POLICY "fleet_vessels_delete_policy"
    ON public.fleet_vessels
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VESSEL LATEST POSITIONS (Live Map)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Any org member can see their org's live vessel positions.
CREATE POLICY "vessel_latest_positions_select_policy"
    ON public.vessel_latest_positions
    FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Owners, admins, and members can push position updates.
-- (Typically done via a service_role key from the AIS ingestion pipeline,
--  but we allow member-level access for manual/testing scenarios.)
CREATE POLICY "vessel_latest_positions_insert_policy"
    ON public.vessel_latest_positions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- UPDATE: Same as insert — UPSERT requires both INSERT and UPDATE policies.
CREATE POLICY "vessel_latest_positions_update_policy"
    ON public.vessel_latest_positions
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    )
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- DELETE: Only owners and admins can clear a vessel's latest position.
CREATE POLICY "vessel_latest_positions_delete_policy"
    ON public.vessel_latest_positions
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. VESSEL POSITION HISTORY (Voyage Playback & Analytics)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Any org member can query historical tracks for their org's vessels.
CREATE POLICY "vessel_position_history_select_policy"
    ON public.vessel_position_history
    FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Owners, admins, and members can append position history.
-- This is the primary write path for the AIS ingestion pipeline.
CREATE POLICY "vessel_position_history_insert_policy"
    ON public.vessel_position_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- NO UPDATE POLICY — History is immutable. No rows should ever be updated.
-- NO DELETE POLICY — History is append-only. No rows should ever be deleted.
-- (The absence of UPDATE/DELETE policies means these operations are denied by default.)


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. GEOFENCES
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Any org member can view their org's geofences.
CREATE POLICY "geofences_select_policy"
    ON public.geofences
    FOR SELECT
    TO authenticated
    USING (
        org_id IN (SELECT public.auth_org_ids())
    );

-- INSERT: Owners, admins, and members can create geofences.
CREATE POLICY "geofences_insert_policy"
    ON public.geofences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- UPDATE: Owners, admins, and members can modify geofence geometry/metadata.
CREATE POLICY "geofences_update_policy"
    ON public.geofences
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    )
    WITH CHECK (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin', 'member']::public.org_role[])
    );

-- DELETE: Only owners and admins can delete geofences.
CREATE POLICY "geofences_delete_policy"
    ON public.geofences
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role_in_org(org_id, ARRAY['owner', 'admin']::public.org_role[])
    );


-- =============================================================================
-- END OF RLS POLICIES
-- =============================================================================
-- ── CREATE APPLICATION/VND.PBF DOMAIN ──
-- This domain registers the custom media type with PostgREST so it knows to return raw binary
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application/vnd.pbf') THEN
        CREATE DOMAIN "application/vnd.pbf" AS bytea;
    END IF;
END
$$;

-- ── CREATE MVT GENERATION FUNCTION ──
CREATE OR REPLACE FUNCTION public.vessel_tiles(z integer, x integer, y integer)
RETURNS "application/vnd.pbf"
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    mvt bytea;
BEGIN
    SELECT ST_AsMVT(mvtgeom, 'vessels') INTO mvt
    FROM (
        SELECT
            v.vessel_id,
            v.nav_status,
            v.speed,
            v.heading,
            v.course,
            v.source,
            s.name AS vessel_name,
            s.mmsi AS vessel_mmsi,
            s.vessel_type AS vessel_type,
            ST_AsMVTGeom(
                ST_Transform(v.location::geometry, 3857),
                ST_TileEnvelope(z, x, y),
                extent => 4096,
                buffer => 64,
                clip_geom => true
            ) AS geom
        FROM public.vessel_latest_positions v
        LEFT JOIN public.vessels s ON s.id = v.vessel_id
        WHERE v.location IS NOT NULL
          AND v.location::geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
    ) AS mvtgeom;

    RETURN mvt;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer) TO authenticated;
-- ── FIX MVT GENERATION FUNCTION ──
-- 1. Changed to SECURITY INVOKER (default) so that RLS policies apply. This prevents tenant data bleeding.
-- 2. Added `tick integer DEFAULT 0` parameter so frontend can append `&tick=...` to bypass MapLibre cache without causing 404s.

-- Drop the previous function signature to prevent PostgREST 300 Multiple Choices conflicts
DROP FUNCTION IF EXISTS public.vessel_tiles(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.vessel_tiles(z integer, x integer, y integer, tick integer DEFAULT 0)
RETURNS "application/vnd.pbf"
LANGUAGE plpgsql
-- Explicitly SECURITY INVOKER so the function runs as the authenticated user and respects RLS
SECURITY INVOKER
AS $$
DECLARE
    mvt bytea;
BEGIN
    SELECT ST_AsMVT(mvtgeom, 'vessels') INTO mvt
    FROM (
        SELECT
            v.vessel_id,
            v.nav_status,
            v.speed,
            v.heading,
            v.course,
            v.source,
            s.name AS vessel_name,
            s.mmsi AS vessel_mmsi,
            s.vessel_type AS vessel_type,
            ST_AsMVTGeom(
                ST_Transform(v.location::geometry, 3857),
                ST_TileEnvelope(z, x, y),
                extent => 4096,
                buffer => 64,
                clip_geom => true
            ) AS geom
        FROM public.vessel_latest_positions v
        LEFT JOIN public.vessels s ON s.id = v.vessel_id
        WHERE v.location IS NOT NULL
          -- Cast the tile bounding box to geography so it uses the GiST index on v.location
          AND v.location && ST_Transform(ST_TileEnvelope(z, x, y), 4326)::geography
    ) AS mvtgeom;

    RETURN mvt;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer, integer) TO authenticated;
-- 1. Enable the pg_cron extension if it isn't already running
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the sweeping function
CREATE OR REPLACE FUNCTION public.sweep_ghost_ships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Overwrite ships that are sitting still and haven't pinged in 15 mins
  UPDATE public.vessel_latest_positions
  SET nav_status = 'at_anchor'
  WHERE speed < 0.5 
    AND timestamp < (NOW() - INTERVAL '15 minutes')
    AND nav_status != 'at_anchor';
    
  -- Optional: Mark fast ships that dropped off the radar as 'not_under_command'
  UPDATE public.vessel_latest_positions
  SET nav_status = 'not_under_command'
  WHERE speed >= 0.5 
    AND timestamp < (NOW() - INTERVAL '60 minutes')
    AND nav_status != 'not_under_command';
END;
$$;

-- 3. Schedule the Cron Job to run every 5 minutes
SELECT cron.schedule(
  'ghost-ship-sweeper-job',
  '*/5 * * * *', -- Standard cron syntax for "Every 5 Minutes"
  $$ SELECT public.sweep_ghost_ships(); $$
);
-- =============================================================================
-- MARINE TRACK — Global AIS Data RLS
-- Migration: 20260526000002_global_ais_rls.sql
--
-- This migration allows ALL authenticated users to read vessels and positions
-- that belong to the global system organization 'ais-ingestion-org'.
-- =============================================================================

CREATE POLICY "global_ais_vessels_select"
    ON public.vessels
    FOR SELECT
    TO authenticated
    USING (
        org_id = (SELECT id FROM public.organizations WHERE slug = 'ais-ingestion-org')
    );

CREATE POLICY "global_ais_positions_select"
    ON public.vessel_latest_positions
    FOR SELECT
    TO authenticated
    USING (
        org_id = (SELECT id FROM public.organizations WHERE slug = 'ais-ingestion-org')
    );
-- =============================================================================
-- FIX: vessel_tiles performance — SECURITY DEFINER + anon read access
-- Migration: 20260530000000_fix_vessel_tiles_performance.sql
--
-- Problem: vessel_tiles uses SECURITY INVOKER, so RLS evaluates 
--          auth_org_ids() on every row for every tile. With 58K vessels
--          this causes statement timeouts (504) on every tile request.
--
-- Solution:
--   1. Switch vessel_tiles to SECURITY DEFINER — bypasses RLS entirely.
--      The function is read-only and returns only spatial data, so this is safe.
--   2. Add anon SELECT policy on vessel_latest_positions so the count
--      query and direct REST queries also work without login.
--   3. Add anon SELECT policy on vessels so vessel metadata loads.
-- =============================================================================

-- ── Step 1: Drop ALL old function signatures to prevent PostgREST 300 ──
DROP FUNCTION IF EXISTS public.vessel_tiles(integer, integer, integer);
DROP FUNCTION IF EXISTS public.vessel_tiles(integer, integer, integer, integer);

-- ── Step 2: Recreate with SECURITY DEFINER (bypasses RLS) ──
CREATE OR REPLACE FUNCTION public.vessel_tiles(z integer, x integer, y integer, tick integer DEFAULT 0)
RETURNS "application/vnd.pbf"
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as the function owner (postgres), bypassing RLS for performance
SET search_path = public
AS $$
DECLARE
    mvt bytea;
BEGIN
    SELECT ST_AsMVT(mvtgeom, 'vessels') INTO mvt
    FROM (
        SELECT
            v.vessel_id,
            v.nav_status,
            v.speed,
            v.heading,
            v.course,
            v.source,
            s.name AS vessel_name,
            s.mmsi AS vessel_mmsi,
            s.vessel_type AS vessel_type,
            ST_AsMVTGeom(
                ST_Transform(v.location::geometry, 3857),
                ST_TileEnvelope(z, x, y),
                extent => 4096,
                buffer => 64,
                clip_geom => true
            ) AS geom
        FROM public.vessel_latest_positions v
        LEFT JOIN public.vessels s ON s.id = v.vessel_id
        WHERE v.location IS NOT NULL
          AND v.location::geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
    ) AS mvtgeom;

    RETURN mvt;
END;
$$;

-- ── Step 3: Grant execute to both anon and authenticated ──
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer, integer) TO authenticated;

-- ── Step 4: Add anon read access for REST API queries (vessel count, etc.) ──
-- Allow anonymous users to read all vessel positions (global AIS data is public)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vessel_latest_positions' 
        AND policyname = 'anon_vessel_positions_select'
    ) THEN
        CREATE POLICY "anon_vessel_positions_select"
            ON public.vessel_latest_positions
            FOR SELECT
            TO anon
            USING (true);
    END IF;
END $$;

-- Allow anonymous users to read vessel metadata (names, types, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vessels' 
        AND policyname = 'anon_vessels_select'
    ) THEN
        CREATE POLICY "anon_vessels_select"
            ON public.vessels
            FOR SELECT
            TO anon
            USING (true);
    END IF;
END $$;
-- =============================================================================
-- Feature: Dynamic Map Data Pipeline
-- Migration: 20260530000001_vessel_bbox_rpc.sql
--
-- Problem: Loading all 76,000+ vessels globally freezes the browser.
-- Solution: This RPC accepts a map bounding box (viewport coordinates)
--           and instantly returns only the vessels within that area.
--           It operates with SECURITY DEFINER to bypass RLS overhead.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_vessels_in_bbox(
    min_lng double precision,
    min_lat double precision,
    max_lng double precision,
    max_lat double precision
)
RETURNS TABLE (
    vessel_id character varying,
    lng double precision,
    lat double precision,
    heading double precision,
    course double precision,
    speed double precision,
    source character varying,
    vessel_name character varying,
    vessel_type character varying,
    vessel_mmsi character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.vessel_id,
        ST_X(v.location::geometry) AS lng,
        ST_Y(v.location::geometry) AS lat,
        v.heading,
        v.course,
        v.speed,
        v.source,
        s.name AS vessel_name,
        s.vessel_type AS vessel_type,
        s.mmsi AS vessel_mmsi
    FROM public.vessel_latest_positions v
    LEFT JOIN public.vessels s ON s.id = v.vessel_id
    WHERE v.location IS NOT NULL
      AND v.location::geometry && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);
END;
$$;

-- Grant execution to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_vessels_in_bbox(double precision, double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.get_vessels_in_bbox(double precision, double precision, double precision, double precision) TO authenticated;
