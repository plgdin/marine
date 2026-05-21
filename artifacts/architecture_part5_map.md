# MarineTrack Architecture Part 5: Realtime Map & Vessel Tracking

This document outlines the architecture for the WebGL-powered real-time map interface, designed to handle millions of vessel updates gracefully using Mapbox GL JS, Supabase Realtime, and Zustand.

## 1. Realtime Vessel Data Flow
- **Ingestion**: External AIS data is processed by the backend (eventually Kafka/Redis) and written to PostgreSQL/PostGIS.
- **WebSocket Broadcast**: Supabase Realtime broadcasts `INSERT`/`UPDATE` events on the `vessel_positions` table.
- **Frontend Queue**: The `realtime.service.ts` receives events and pushes them into an Event Queue to throttle rendering.
- **State Updates**: At a fixed tick rate (e.g., 500ms), the queue flushes updates into the Zustand `realtime.store.ts` (using `Map` for O(1) upserts).
- **Map Synchronization**: A Map hook (`useMapVesselSync`) subscribes to the Zustand store. Instead of triggering React re-renders, it imperatively calls `map.getSource('vessels').setData(geoJson)`.

## 2. Map Rendering Architecture
- **Engine**: Mapbox GL JS for WebGL-accelerated rendering.
- **React Wrapper**: `react-map-gl` to handle map lifecycle, viewport state, and React-based popups.
- **Data Layers**: All high-frequency data (vessels, heatmaps, clusters) are rendered via native Mapbox Sources (GeoJSON) and Layers (Symbol, Circle, Heatmap), entirely bypassing the React reconciliation cycle.

## 3. WebSocket Architecture
- **Channels**: Subscribe to a single Supabase channel `public:vessel_positions`.
- **Payloads**: Delta payloads only (vessel ID, location, heading, speed).
- **Throttling**: The raw WebSocket callback debounces/batches events via `requestAnimationFrame` before mutating the Zustand store.

## 4. Reconnection Strategy
- **Exponential Backoff**: Configured in `realtime.service.ts` (max 5 attempts, capped at 30s).
- **Gap Filling**: On successful reconnection, a TanStack query (`/api/vessels/positions/latest`) is triggered to fetch missed positions since the disconnect timestamp, patching the store before resuming live events.

## 5. Marker Clustering Strategy
- **Engine**: Mapbox GL JS native clustering (`cluster: true` on the GeoJSON source) backed by Supercluster.
- **Thresholds**: Defined in `constants.ts` (e.g., cluster below zoom 8, individual icons above 8).
- **Visuals**: Cluster circles scale dynamically based on point count, colored by density severity.

## 6. Layer Architecture (Z-Index)
1. **Base Map**: Mapbox dark satellite/street hybrid.
2. **Heatmaps**: Lowest data layer, visible at zoomed-out levels.
3. **Geofences**: Polygons and line strings for alert zones.
4. **Trajectories**: Historical tracks/routes (Line strings).
5. **Vessel Clusters**: Grouped data nodes.
6. **Vessel Icons**: Individual SVG icons (Symbol layer), rotated by heading.
7. **Popups/UI**: React portals overlaid on top.

## 7. Vessel Rendering Optimization
- **Rule of Thumb**: **NO React Components for vessel markers**. Rendering 10,000 `<Marker>` React components will crash the browser.
- **Implementation**: Mapbox `SymbolLayer` pointing to an SVG sprite sheet loaded via `map.addImage()`. 

## 8. Marker Virtualization
- Handled natively by WebGL. Mapbox culls vessels outside the current viewport canvas and simplifies geometries based on the current zoom level.

## 9. Realtime Synchronization
- We maintain a `Map` in Zustand. We derive a `GeoJSON.FeatureCollection` from this map. 
- A dedicated hook `useMapSourceSync` watches this GeoJSON and calls `setData()` on the map instance when the underlying reference changes.

## 10. Geofencing Architecture
- Polygons stored in PostGIS. Loaded via TanStack Query on mount.
- Rendered using Mapbox `FillLayer` with translucent opacity and `LineLayer` for borders.

## 11. Heatmap Architecture
- A dedicated `HeatmapLayer` attached to the vessel GeoJSON source. 
- Interpolates weight based on vessel density (and optionally speed or risk). 
- Fades out entirely when zooming in past `zoom: 6`.

## 12. Route Playback Architecture
- **Time Slider**: A UI component that sets a `playbackTimestamp` in the map store.
- **Interpolation**: When in playback mode, realtime updates are paused. Historical positions are queried, and a requestAnimationFrame loop interpolates vessel positions along the historical track.

## 13. Vessel Popup Architecture
- Click events on the Mapbox canvas map to vessel IDs.
- React state (`selectedVesselId`) triggers a `react-map-gl` `<Popup>`.
- The popup fetches detailed vessel data via TanStack Query and displays it as a floating React component over the WebGL canvas.

## 14. WebGL Optimization Strategy
- **Worker Threads**: Mapbox GL uses web workers for GeoJSON parsing. We ensure the GeoJSON payload is flat and minimized.
- **Garbage Collection**: Reusing the same GeoJSON object reference and mutating its `features` array in place (if possible) reduces GC spikes.

## 15. Realtime Cache Strategy
- Zustand holds the *live* tip of the spear (latest known positions).
- TanStack Query holds the *historical* data (voyage details, alerts).

## 16. Event Queue Strategy
- WebSocket bursts (e.g., 500 events/sec) are pushed to an array.
- A `setInterval` (e.g., 200ms) processes the array, updates the Zustand map, and triggers one React state update.

## 17. AIS Ingestion Readiness
- The frontend assumes position updates are agnostic to the source (AIS vs manual). The schema requires a `timestamp` and `source` field.

## 18. Failure Recovery Strategy
- If WebGL context is lost (rare), `react-map-gl` triggers a re-mount.
- Store state remains intact in Zustand, instantly re-populating the new canvas.

## 19. Map State Management
- `src/features/map/stores/map.store.ts`: Tracks viewport (`lng`, `lat`, `zoom`), active layers (heatmaps, clusters, labels), and selected entities.

## 20. Performance Optimization Strategy
- Manual Chunking: Mapbox GL JS is heavy (~800kb). It is split into a separate vendor chunk.
- CSS `will-change: transform` on UI overlays.
- Debounced viewport updates.

---

## Folder Structure Implementation

```text
src/
  features/
    map/
      components/
        MapContainer.tsx       # Core Mapbox wrapper
        MapControls.tsx        # Zoom, bearing controls
        LayerPanel.tsx         # Toggle heatmaps/vessels
        VesselPopup.tsx        # React popup for selected vessel
        layers/
          VesselLayer.tsx      # Symbol & Cluster definitions
          HeatmapLayer.tsx     # Heatmap definitions
          GeofenceLayer.tsx    # Polygon definitions
      stores/
        map.store.ts           # Viewport & layer state
      hooks/
        useMapSync.ts          # Imperative GeoJSON syncing
        useMapInteractions.ts  # Click, hover, popups
      utils/
        geo.utils.ts           # GeoJSON converters
      pages/
        MapPage.tsx
```
