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
