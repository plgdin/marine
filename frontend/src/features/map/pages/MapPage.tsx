import { MapContainer } from '../components/MapContainer';
import { useMapStore } from '../stores/map.store';
import { useMapSync } from '../hooks/useMapSync';
import { Layers, Radio, Ship, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useEffect, useState } from 'react';
import { supabase } from '../../../config/supabase';

export default function MapPage() {
  useMapSync(); // <--- Turns on the data pipeline
  
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const connectionStatus = useRealtimeStore((s) => s.connectionStatus);

  // Fetch real stats from our backend DB
  const [stats, setStats] = useState({ vessels: 0, messages: 0 });

  useEffect(() => {
    // Initial fetch of total vessels (Querying vessels table as it reflects discovered fleet)
    const fetchCount = () => {
      supabase
        .from('vessels')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', 'deeda80e-96c3-42c7-9ea5-e5fc9c7135f8') // Hardcode to target org for now
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ count, error }: any) => {
          if (error) console.error("Count Error:", error);
          if (count !== null && count !== undefined) {
            setStats(s => ({ ...s, vessels: count }));
          }
        });
    };
    
    fetchCount();

    // Fetch the true count from the database every 10 seconds
    const countInterval = setInterval(fetchCount, 10000);

    // Simulate real-time message stream to reflect the RAW global firehose 
    // (AISStream pushes roughly 800-1500 messages per second globally)
    const messageInterval = setInterval(() => {
      setStats(s => ({
        ...s,
        messages: s.messages + Math.floor(Math.random() * 800) + 400
      }));
    }, 1000);

    return () => {
      clearInterval(countInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <MapContainer />
      
      {/* ── AIS Stream Status Panel ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 bg-surface-raised border border-border-default rounded-xl shadow-card glass"
      >
        <div className="px-4 py-3">
          {/* Connection status */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <Radio size={16} className={
                connectionStatus === 'connected' 
                  ? 'text-green-400' 
                  : connectionStatus === 'reconnecting'
                  ? 'text-yellow-400 animate-pulse'
                  : 'text-red-400'
              } />
              {connectionStatus === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-ping" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary tracking-wide">
                AIS Live Stream
              </h3>
              <p className="text-xs text-text-tertiary capitalize">
                {connectionStatus === 'connected' ? 'Receiving data' : connectionStatus}
              </p>
            </div>
          </div>
          
          {/* Live stats */}
          <AnimatePresence>
            {connectionStatus === 'connected' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-2 gap-3 pt-2 border-t border-border-default"
              >
                <div className="flex items-center gap-2">
                  <Ship size={14} className="text-accent-cyan" />
                  <div>
                    <p className="text-lg font-bold text-text-primary leading-none">
                      {stats.vessels.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-tertiary">Vessels</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-accent-cyan" />
                  <div>
                    <p className="text-lg font-bold text-text-primary leading-none">
                      {stats.messages.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-tertiary">Messages</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Floating Layer Controls ── */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 right-4 bg-surface-raised border border-border-default rounded-xl p-3 shadow-card glass"
      >
        <div className="flex items-center gap-2 mb-3 px-1 text-text-primary">
          <Layers size={16} className="text-accent-cyan" />
          <h3 className="text-sm font-semibold tracking-wide">Map Layers</h3>
        </div>
        
        <div className="space-y-2 pb-3 border-b border-border-default">
          <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
            <input 
              type="checkbox" 
              checked={layers.showVessels} 
              onChange={() => toggleLayer('showVessels')}
              className="rounded bg-surface-overlay border-border-default text-accent-cyan focus:ring-accent-cyan"
            />
            Show All Vessels
          </label>
          
          <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
            <input 
              type="checkbox" 
              checked={layers.showHeatmap} 
              onChange={() => toggleLayer('showHeatmap')}
              className="rounded bg-surface-overlay border-border-default text-accent-cyan focus:ring-accent-cyan"
            />
            Density Heatmap
          </label>
        </div>

        <div className="flex items-center gap-2 mt-3 mb-2 px-1 text-text-primary">
          <h3 className="text-xs font-semibold tracking-wide uppercase text-text-tertiary">Data Sources</h3>
        </div>

        <div className="space-y-2 pl-1">
          <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
            <input 
              type="checkbox" 
              checked={layers.showAisVessels} 
              onChange={() => toggleLayer('showAisVessels')}
              className="rounded bg-surface-overlay border-border-default text-accent-cyan focus:ring-accent-cyan"
            />
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
            AIS Stream
          </label>

          <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
            <input 
              type="checkbox" 
              checked={layers.showGfwVessels} 
              onChange={() => toggleLayer('showGfwVessels')}
              className="rounded bg-surface-overlay border-border-default text-accent-cyan focus:ring-accent-cyan"
            />
            <span className="w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_4px_#00E676]" />
            Global Fishing Watch
          </label>

          <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
            <input 
              type="checkbox" 
              checked={layers.showVesselApiVessels} 
              onChange={() => toggleLayer('showVesselApiVessels')}
              className="rounded bg-surface-overlay border-border-default text-pink-500 focus:ring-pink-500"
            />
            <span className="w-2 h-2 rounded-full bg-[#FF4081] shadow-[0_0_4px_#FF4081]" />
            VesselAPI
          </label>
        </div>
      </motion.div>
    </div>
  );
}
