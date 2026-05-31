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
