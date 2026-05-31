DROP FUNCTION IF EXISTS public.vessel_tiles(integer, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.vessel_tiles(z integer, x integer, y integer)
RETURNS "application/vnd.pbf"
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    mvt bytea;
BEGIN
    SELECT extensions.ST_AsMVT(mvtgeom.*, 'vessels') INTO mvt
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
            extensions.ST_AsMVTGeom(
                extensions.ST_Transform(v.location::extensions.geometry, 3857),
                extensions.ST_TileEnvelope(z, x, y),
                extent => 4096,
                buffer => 64,
                clip_geom => true
            ) AS geom
        FROM public.vessel_latest_positions v
        LEFT JOIN public.vessels s ON s.id = v.vessel_id
        WHERE v.location IS NOT NULL
          AND v.location::extensions.geometry && extensions.ST_Transform(extensions.ST_TileEnvelope(z, x, y), 4326)
    ) AS mvtgeom;
    RETURN mvt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
