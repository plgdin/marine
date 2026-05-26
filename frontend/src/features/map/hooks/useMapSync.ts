import { useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { useMapStore } from '../stores/map.store';
import { useOrgId } from '@/features/auth/stores/auth.store';

export function useMapSync() {
  const setVessels = useMapStore((state) => state.setVessels);
  const updateVesselPosition = useMapStore((state) => state.updateVesselPosition);
  
  // We need the user's orgId to only pull their fleet's data
  const orgId = useOrgId(); 

  useEffect(() => {

    // 1. FETCH INITIAL MAP STATE
    const fetchInitialState = async () => {
      console.log(`[DEBUG] Fetching initial fleet positions... (orgId from store: ${orgId})`);
      const { data, error } = await supabase
        .from('vessel_latest_positions')
        .select(`
          vessel_id,
          location,
          heading,
          course,
          speed,
          source,
          nav_status,
          vessels ( name, mmsi, vessel_type )
        `)
        .limit(1000);

      if (error) {
        console.error('[DEBUG] Failed to load ships from DB:', error);
        return;
      }

      if (data) {
        setVessels(data);
        console.log(`[DEBUG] Loaded ${data.length} ships onto the map.`);
      } else {
        console.log(`[DEBUG] Query succeeded but returned null data.`);
      }
    };

    fetchInitialState();

    // 2. SUBSCRIBE TO LIVE DATABASE UPDATES
    console.log("Connecting Supabase Realtime...");
    const channel = supabase.channel('mapsync:vessel_latest_positions')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'vessel_latest_positions'
        },
        (payload) => {
          // Push the new coordinate to the Zustand store so React re-renders the dot
          updateVesselPosition(payload.new as any);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log("Realtime connected perfectly.");
        if (status === 'CHANNEL_ERROR') console.error("Realtime connection failed.");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, setVessels, updateVesselPosition]);
}
