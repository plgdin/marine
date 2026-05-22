import { MapContainer } from '../components/MapContainer';
import { useMapStore } from '../stores/map.store';
import { Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MapPage() {
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  return (
    <div className="w-full h-full relative">
      <MapContainer />
      
      {/* Floating Layer Controls */}
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
