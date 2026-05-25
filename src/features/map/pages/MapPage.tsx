import { MapContainer } from '../components/MapContainer';
import { useMapStore } from '../stores/map.store';
import { useMapSync } from '../hooks/useMapSync';
import { Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MapPage() {
  useMapSync(); // <--- Turns on the data pipeline
  
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  return (
    <div className="w-full h-full relative">
      <MapContainer />
      
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
