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
