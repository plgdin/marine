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
