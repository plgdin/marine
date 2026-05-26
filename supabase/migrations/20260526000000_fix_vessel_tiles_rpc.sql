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
