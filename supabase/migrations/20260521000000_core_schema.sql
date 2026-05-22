-- ==========================================
-- MARINE TRACK: Core Database Schema
-- ==========================================

-- Enable PostGIS for spatial queries (vessels, geofences)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── 1. Organizations & Members ──────────────────────────
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    plan_id TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'viewer',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);

-- ── 2. Fleet & Vessels ──────────────────────────────────
CREATE TYPE vessel_status AS ENUM ('active', 'inactive', 'maintenance');

CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mmsi TEXT,
    imo TEXT,
    name TEXT NOT NULL,
    call_sign TEXT,
    flag_country TEXT,
    vessel_type TEXT NOT NULL,
    gross_tonnage INTEGER,
    deadweight INTEGER,
    length_overall NUMERIC,
    beam NUMERIC,
    year_built INTEGER,
    status vessel_status DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fleet_vessels (
    fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    PRIMARY KEY (fleet_id, vessel_id)
);

-- ── 3. High-Frequency Realtime (Positions) ──────────────
CREATE TYPE nav_status AS ENUM (
    'underway', 'anchored', 'not-under-command', 
    'restricted', 'moored', 'aground', 
    'fishing', 'sailing', 'unknown'
);

CREATE TABLE vessel_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    heading NUMERIC, -- 0-360
    course NUMERIC,  -- COG
    speed NUMERIC,   -- knots
    nav_status nav_status DEFAULT 'unknown',
    rot NUMERIC,     -- Rate of Turn
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'api'
);
-- Index for rapid spatial queries
CREATE INDEX idx_vessel_positions_location ON vessel_positions USING GIST (location);
-- Index for fetching latest positions fast
CREATE INDEX idx_vessel_positions_vessel_time ON vessel_positions (vessel_id, timestamp DESC);

-- ── 4. Spatial Geofences ────────────────────────────────
CREATE TYPE geofence_type AS ENUM ('port', 'anchorage', 'eca', 'custom', 'restricted');

CREATE TABLE geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type geofence_type DEFAULT 'custom',
    color TEXT DEFAULT '#ffffff',
    polygon GEOGRAPHY(POLYGON, 4326) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_geofences_polygon ON geofences USING GIST (polygon);

-- ── 5. Enterprise API Tokens ────────────────────────────
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    scopes TEXT[] DEFAULT '{"read"}'::TEXT[],
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Enable Supabase Realtime for the high-frequency positions
ALTER PUBLICATION supabase_realtime ADD TABLE vessel_positions;
