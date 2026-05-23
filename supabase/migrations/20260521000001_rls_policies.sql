-- =============================================================================
-- MARINE TRACK — Row Level Security Policies (Production Optimized)
-- Migration: 20260522000001_rls_policies.sql
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
-- 1. RLS HELPER FUNCTIONS (STRICT O(1) JWT FAST-PATH)
-- ─────────────────────────────────────────────────────────────────────────────
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

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'role',
        ''
    );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORGANIZATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "organizations_select_policy" ON public.organizations
    FOR SELECT TO authenticated USING (id = public.auth_org_id());

CREATE POLICY "organizations_insert_policy" ON public.organizations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "organizations_update_policy" ON public.organizations
    FOR UPDATE TO authenticated 
    USING (id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'))
    WITH CHECK (id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'));

CREATE POLICY "organizations_delete_policy" ON public.organizations
    FOR DELETE TO authenticated 
    USING (id = public.auth_org_id() AND public.auth_role() = 'owner');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ORG MEMBERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "org_members_select_policy" ON public.org_members
    FOR SELECT TO authenticated USING (org_id = public.auth_org_id());

CREATE POLICY "org_members_insert_policy" ON public.org_members
    FOR INSERT TO authenticated 
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'));

CREATE POLICY "org_members_update_policy" ON public.org_members
    FOR UPDATE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'))
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'));

CREATE POLICY "org_members_delete_policy" ON public.org_members
    FOR DELETE TO authenticated 
    USING ((org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin')) OR user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VESSELS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "vessels_select_policy" ON public.vessels
    FOR SELECT TO authenticated USING (org_id = public.auth_org_id());

CREATE POLICY "vessels_insert_policy" ON public.vessels
    FOR INSERT TO authenticated 
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "vessels_update_policy" ON public.vessels
    FOR UPDATE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'))
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "vessels_delete_policy" ON public.vessels
    FOR DELETE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FLEETS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "fleets_select_policy" ON public.fleets
    FOR SELECT TO authenticated USING (org_id = public.auth_org_id());

CREATE POLICY "fleets_insert_policy" ON public.fleets
    FOR INSERT TO authenticated 
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "fleets_update_policy" ON public.fleets
    FOR UPDATE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'))
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "fleets_delete_policy" ON public.fleets
    FOR DELETE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FLEET ↔ VESSEL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "fleet_vessels_select_policy" ON public.fleet_vessels
    FOR SELECT TO authenticated USING (org_id = public.auth_org_id());

CREATE POLICY "fleet_vessels_insert_policy" ON public.fleet_vessels
    FOR INSERT TO authenticated 
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "fleet_vessels_delete_policy" ON public.fleet_vessels
    FOR DELETE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VESSEL LATEST POSITIONS (Live Map)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "vessel_latest_positions_select_policy" ON public.vessel_latest_positions
    FOR SELECT TO authenticated USING (org_id = public.auth_org_id());

CREATE POLICY "vessel_latest_positions_insert_policy" ON public.vessel_latest_positions
    FOR INSERT TO authenticated 
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "vessel_latest_positions_update_policy" ON public.vessel_latest_positions
    FOR UPDATE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'))
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "vessel_latest_positions_delete_policy" ON public.vessel_latest_positions
    FOR DELETE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. VESSEL POSITION HISTORY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "vessel_position_history_select_policy" ON public.vessel_position_history
    FOR SELECT TO authenticated USING (org_id = public.auth_org_id());

CREATE POLICY "vessel_position_history_insert_policy" ON public.vessel_position_history
    FOR INSERT TO authenticated 
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. GEOFENCES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "geofences_select_policy" ON public.geofences
    FOR SELECT TO authenticated USING (org_id = public.auth_org_id());

CREATE POLICY "geofences_insert_policy" ON public.geofences
    FOR INSERT TO authenticated 
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "geofences_update_policy" ON public.geofences
    FOR UPDATE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'))
    WITH CHECK (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin', 'member'));

CREATE POLICY "geofences_delete_policy" ON public.geofences
    FOR DELETE TO authenticated 
    USING (org_id = public.auth_org_id() AND public.auth_role() IN ('owner', 'admin'));