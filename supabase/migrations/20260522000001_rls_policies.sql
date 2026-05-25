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
