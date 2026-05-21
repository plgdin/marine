-- ==========================================
-- MARINE TRACK: RLS Policies
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- ── Helper Function: Get User's Org ID from JWT ─────────
-- We expect an Auth Hook to inject app_metadata -> org_id.
-- This makes our RLS policies execute in O(1) time without JOINs.
CREATE OR REPLACE FUNCTION auth.org_id() 
RETURNS UUID AS $$
  SELECT (NULLIF(current_setting('request.jwt.claim.app_metadata', true)::jsonb->>'org_id', ''))::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.org_role() 
RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claim.app_metadata', true)::jsonb->>'role';
$$ LANGUAGE SQL STABLE;

-- ── 1. Organizations ────────────────────────────────────
-- Users can read their own organization
CREATE POLICY "Orgs: Read Access" ON organizations 
FOR SELECT USING (id = auth.org_id());

-- Only admins/owners can update the org
CREATE POLICY "Orgs: Update Access" ON organizations 
FOR UPDATE USING (
  id = auth.org_id() AND auth.org_role() IN ('admin', 'owner')
);

-- ── 2. Org Members ──────────────────────────────────────
CREATE POLICY "OrgMembers: Read Access" ON org_members
FOR SELECT USING (org_id = auth.org_id());

-- ── 3. Vessels ──────────────────────────────────────────
CREATE POLICY "Vessels: Read Access" ON vessels
FOR SELECT USING (org_id = auth.org_id());

CREATE POLICY "Vessels: Write Access" ON vessels
FOR ALL USING (
  org_id = auth.org_id() AND auth.org_role() IN ('admin', 'owner', 'member')
);

-- ── 4. Fleets ───────────────────────────────────────────
CREATE POLICY "Fleets: Read Access" ON fleets
FOR SELECT USING (org_id = auth.org_id());

CREATE POLICY "Fleets: Write Access" ON fleets
FOR ALL USING (
  org_id = auth.org_id() AND auth.org_role() IN ('admin', 'owner', 'member')
);

-- ── 5. Vessel Positions ─────────────────────────────────
CREATE POLICY "Positions: Read Access" ON vessel_positions
FOR SELECT USING (org_id = auth.org_id());

CREATE POLICY "Positions: Insert Access" ON vessel_positions
FOR INSERT WITH CHECK (org_id = auth.org_id());

-- ── 6. Geofences ────────────────────────────────────────
CREATE POLICY "Geofences: Read Access" ON geofences
FOR SELECT USING (org_id = auth.org_id());

CREATE POLICY "Geofences: Write Access" ON geofences
FOR ALL USING (
  org_id = auth.org_id() AND auth.org_role() IN ('admin', 'owner', 'member')
);

-- ── 7. API Tokens ───────────────────────────────────────
CREATE POLICY "APITokens: Read Access" ON api_tokens
FOR SELECT USING (org_id = auth.org_id());

-- Only admins can manage API tokens
CREATE POLICY "APITokens: Write Access" ON api_tokens
FOR ALL USING (
  org_id = auth.org_id() AND auth.org_role() IN ('admin', 'owner')
);
