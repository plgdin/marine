import { motion } from 'framer-motion';
import { Ship, Map, Bell, Activity } from 'lucide-react';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useMemo } from 'react';

export default function DashboardPage() {
  const _positionVersion = useRealtimeStore(s => s._positionVersion);
  const unreadAlertCount = useRealtimeStore(s => s.unreadAlertCount);
  
  // Compute stats from the mutable positions buffer
  const statsData = useMemo(() => {
    const positions = useRealtimeStore.getState().positions;
    let underway = 0;
    let vesselApiCount = 0;
    
    for (const pos of positions.values()) {
      if (pos.navStatus === 'underway') {
        underway++;
      }
      if (pos.source === 'api') {
        vesselApiCount++;
      }
    }
    
    return {
      activeVessels: positions.size,
      vesselsUnderway: underway,
      alertEvents: unreadAlertCount,
      vesselApiVessels: vesselApiCount,
    };
  }, [_positionVersion, unreadAlertCount]);

  const stats = [
    { label: 'Active Vessels',    value: statsData.activeVessels.toLocaleString(),   icon: Ship,     color: 'var(--color-accent-cyan)' },
    { label: 'Vessels Underway',  value: statsData.vesselsUnderway.toLocaleString(), icon: Activity, color: 'var(--color-status-underway)' },
    { label: 'Alert Events',      value: statsData.alertEvents.toLocaleString(),     icon: Bell,     color: 'var(--color-status-alert)' },
    { label: 'VesselAPI Tracked', value: statsData.vesselApiVessels.toLocaleString(), icon: Map,      color: '#FF4081' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Fleet intelligence overview
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="p-5 rounded-xl"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                  {stat.label}
                </p>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${stat.color}18` }}
                >
                  <Icon size={16} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {stat.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Placeholder and Vessel API areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl p-5 lg:col-span-2"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border-subtle)',
            minHeight: 280,
          }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <span className="w-2 h-2 rounded-full bg-[#FF4081] shadow-[0_0_4px_#FF4081]" />
            Recent VesselAPI Data
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
            {statsData.vesselApiVessels === 0 ? (
              <p className="text-sm text-text-tertiary">No VesselAPI data loaded. Pan the map to load data.</p>
            ) : (
              Array.from(useRealtimeStore.getState().positions.values())
                .filter(p => p.source === 'api')
                .slice(0, 10)
                .map((vessel) => (
                  <div key={vessel.id} className="p-3 rounded-lg flex items-center justify-between border border-border-default bg-surface-overlay">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{vessel.name || 'Unknown Vessel'}</p>
                      <p className="text-xs text-text-tertiary">MMSI: {vessel.vesselId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary">{vessel.speed !== null ? `${vessel.speed} kn` : 'N/A'}</p>
                      <p className="text-xs text-text-tertiary">{new Date(vessel.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-xl p-5"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border-subtle)',
            minHeight: 280,
          }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Recent Alerts
          </h2>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-8 skeleton rounded-lg" style={{ width: `${80 - j * 10}%` }} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
