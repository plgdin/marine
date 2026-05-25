import { motion } from 'framer-motion';
import { Ship, Navigation } from 'lucide-react';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useMemo } from 'react';
import { useMapStore } from '../../map/stores/map.store';

export default function VesselsPage() {
  const _positionVersion = useRealtimeStore((s: any) => s._positionVersion);
  const layers = useMapStore((s: any) => s.layers);
  
  const vessels = useMemo(() => {
    const positions = useRealtimeStore.getState().positions;
    return Array.from(positions.values())
      .filter(pos => {
        if (pos.source === 'ais' || pos.source === 'manual') return layers.showAisVessels;
        if (pos.source === 'api') return layers.showVesselApiVessels;
        if (pos.source === 'globalfishing') return layers.showGfwVessels;
        if (pos.source === 'transparency') return layers.showTransparencyVessels;
        return true;
      })
      .map(pos => {
        return {
          ...pos,
          name: pos.name || 'Unknown',
          type: 'other',
          destination: 'N/A'
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [_positionVersion, layers.showAisVessels, layers.showGfwVessels, layers.showTransparencyVessels, layers.showVesselApiVessels]);

  return (
    <div className="p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Vessels</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Manage and track your vessel fleet ({vessels.length} unique vessels)
        </p>
      </motion.div>
      
      {vessels.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-subtle)', minHeight: 300 }}>
          <Ship size={40} style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No vessels yet</p>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Add vessels or connect an AIS feed to start tracking</p>
        </motion.div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-raised)' }}>
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase" style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-tertiary)' }}>
              <tr>
                <th className="px-6 py-3 font-medium tracking-wider">Vessel Name</th>
                <th className="px-6 py-3 font-medium tracking-wider">MMSI</th>
                <th className="px-6 py-3 font-medium tracking-wider">Type</th>
                <th className="px-6 py-3 font-medium tracking-wider">Status</th>
                <th className="px-6 py-3 font-medium tracking-wider">Source</th>
                <th className="px-6 py-3 font-medium tracking-wider">Speed / Course</th>
                <th className="px-6 py-3 font-medium tracking-wider">Destination</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ '--tw-divide-color': 'var(--color-border-subtle)' } as React.CSSProperties}>
              {vessels.slice(0, 100).map((vessel) => (
                <tr key={vessel.id} className="hover:bg-opacity-50 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    <div className="flex items-center gap-2">
                      <Ship size={14} className="text-accent-cyan" />
                      {vessel.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">{vessel.vesselId}</td>
                  <td className="px-6 py-4 capitalize">{vessel.type.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs" style={{ background: 'var(--color-surface-overlay)' }}>
                      {vessel.navStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                      vessel.source === 'ais' ? 'bg-green-100 text-green-800' : 
                      vessel.source === 'transparency' ? 'bg-cyan-100 text-cyan-800' :
                      vessel.source === 'globalfishing' ? 'bg-emerald-100 text-emerald-800' :
                      vessel.source === 'api' ? 'bg-pink-100 text-pink-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vessel.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Navigation size={12} style={{ transform: `rotate(${vessel.course || 0}deg)` }} />
                      {vessel.speed?.toFixed(1) || 0} kn
                    </div>
                  </td>
                  <td className="px-6 py-4 truncate max-w-xs">{vessel.destination}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vessels.length > 100 && (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Showing 100 of {vessels.length} vessels
            </div>
          )}
        </div>
      )}
    </div>
  );
}
