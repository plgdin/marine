import { logger } from '@shared/utils/logger';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import type { VesselPosition } from '@shared/types/domain.types';

const GFW_API_URL = 'https://gateway.api.globalfishingwatch.org/v3';

export interface GFWVesselInfo {
  id: string;
  dataset: string;
  registryInfo?: {
    extraFields?: {
      flag?: string;
      length?: number;
      tonnage?: number;
      gearType?: string;
    };
  };
}

class GFWService {
  private token: string | undefined;
  // Cache to avoid redundant calls for same MMSI
  private cache = new Map<string, GFWVesselInfo | null>();
  
  private isPolling = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.token = import.meta.env.VITE_GFW_API_TOKEN;
  }

  /**
   * Search for vessel metadata by MMSI.
   * Returns null if not found or if no token is configured.
   */
  async searchByMmsi(mmsi: string): Promise<GFWVesselInfo | null> {
    if (!this.token) {
      return null;
    }

    if (this.cache.has(mmsi)) {
      return this.cache.get(mmsi)!;
    }

    try {
      const url = `${GFW_API_URL}/vessels/search?query=${mmsi}&datasets[0]=public-global-vessel-identity:latest`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status !== 404) {
           logger.error(`GFWService: API error ${response.status} for MMSI ${mmsi}`);
        }
        this.cache.set(mmsi, null);
        return null;
      }

      const data = await response.json();
      if (data && data.entries && data.entries.length > 0) {
        const entry = data.entries[0] as GFWVesselInfo;
        this.cache.set(mmsi, entry);
        return entry;
      }

      this.cache.set(mmsi, null);
      return null;
    } catch (err) {
      logger.error('GFWService: Failed to fetch vessel info', err);
      return null;
    }
  }

  /**
   * Fetch recent fishing events (last 2 days)
   * to display vessels from GFW API.
   */
  async fetchVesselsInBoundingBox() {
    if (!this.token) return;

    // GFW data typically has a 3-5 day processing latency.
    // Fetch a 14-day window to ensure we always get the most recent data.
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
      // Fetch the 500 most recent global fishing events
      const url = `${GFW_API_URL}/events?datasets[0]=public-global-fishing-events:latest&start-date=${startStr}&end-date=${endStr}&limit=500&offset=0`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data && data.entries && Array.isArray(data.entries)) {
        const positions: VesselPosition[] = [];
        
        for (const event of data.entries) {
          if (!event.position || !event.vessel) continue;

          positions.push({
            id: `gfw-${event.vessel.ssvid}-${Date.now()}`,
            vesselId: String(event.vessel.ssvid || event.vessel.id),
            orgId: 'gfw',
            location: { lat: event.position.lat, lng: event.position.lon },
            name: event.vessel.name || undefined,
            heading: null,
            course: null,
            speed: event.fishing?.averageSpeedKnots || null,
            navStatus: 'fishing',
            rot: null,
            timestamp: event.end || new Date().toISOString(),
            source: 'globalfishing',
          });
        }

        const store = useRealtimeStore.getState();
        positions.forEach(pos => {
          // Do not overwrite live AIS or Transparency data with historical GFW data
          const existing = store.positions.get(pos.vesselId);
          if (!existing || existing.source === 'globalfishing') {
            store.upsertPosition(pos);
          }
        });
      }
    } catch (err) {
      logger.error('GFWService: Failed to fetch fishing events', err);
    }
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = () => {
      // Fetch 500 recent global events, regardless of bounds
      this.fetchVesselsInBoundingBox();
    };

    this.intervalId = setInterval(poll, 60000);
    poll(); // Initial fetch
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }
}

export const gfwService = new GFWService();
