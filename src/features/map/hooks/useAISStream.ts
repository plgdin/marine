import { useEffect, useRef, useCallback, useState } from 'react';
import { aisStreamService } from '@shared/services/aisstream.service';
import env from '@config/env';

export interface AISStreamStats {
  isConnected: boolean;
  messageCount: number;
  vesselCount: number;
}

/**
 * Hook to manage the AISStream WebSocket lifecycle.
 * Connects on mount, disconnects on unmount.
 * 
 * Optionally accepts bounding boxes to filter by region,
 * defaults to worldwide coverage.
 */
export function useAISStream(options?: {
  boundingBoxes?: [number, number][][];
  enabled?: boolean;
}) {
  const { boundingBoxes, enabled = true } = options ?? {};
  const connectedRef = useRef(false);
  const [stats, setStats] = useState<AISStreamStats>({
    isConnected: false,
    messageCount: 0,
    vesselCount: 0,
  });

  const updateStats = useCallback(() => {
    const fullStats = aisStreamService.getStats();
    setStats({
      isConnected: fullStats.isConnected,
      messageCount: fullStats.messageCount,
      vesselCount: fullStats.vesselCount,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const apiKey = env.aisStreamApiKey;
    if (!apiKey) {
      console.warn('useAISStream: VITE_AISSTREAM_API_KEY not set in environment');
      return;
    }

    // Configure and connect
    aisStreamService.configure({
      apiKey,
      boundingBoxes: boundingBoxes ?? [[[-90, -180], [90, 180]]],
      onStatsUpdate: updateStats,
    });

    if (!connectedRef.current) {
      aisStreamService.connect();
      connectedRef.current = true;
    }

    // Poll stats every 2 seconds for the UI
    const statsInterval = setInterval(() => {
      const s = aisStreamService.getStats();
      setStats({
        isConnected: s.isConnected,
        messageCount: s.messageCount,
        vesselCount: s.vesselCount,
      });
    }, 2000);

    return () => {
      clearInterval(statsInterval);
      aisStreamService.disconnect();
      connectedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, updateStats]); // intentionally omit boundingBoxes to avoid reconnect on every change

  // Handle bounding box updates separately (without full reconnect)
  useEffect(() => {
    if (boundingBoxes && connectedRef.current) {
      aisStreamService.updateBoundingBoxes(boundingBoxes);
    }
  }, [boundingBoxes]);

  return stats;
}
