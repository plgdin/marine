import { MapContainer } from '../components/MapContainer';
import { useMapStore } from '../stores/map.store';
import { Layers, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealtimeStore } from '@shared/stores/realtime.store';

export default function MapPage() {
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const connectionStatus = useRealtimeStore((s) => s.connectionStatus);

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
        
        <div className="space-y-2">
          <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
            <input 
              type="checkbox" 
              checked={layers.showVessels} 
              onChange={() => toggleLayer('showVessels')}
              className="rounded bg-surface-overlay border-border-default text-accent-cyan focus:ring-accent-cyan"
            />
            Vessels & Clusters
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
      </motion.div>
    </div>
  );
}
