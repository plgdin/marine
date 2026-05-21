import { motion } from 'framer-motion';
import { Ship, Map, Bell, Activity } from 'lucide-react';

const stats = [
  { label: 'Active Vessels',    value: '—',   icon: Ship,     color: 'var(--color-accent-cyan)' },
  { label: 'Vessels Underway',  value: '—',   icon: Activity, color: 'var(--color-status-underway)' },
  { label: 'Alert Events',      value: '—',   icon: Bell,     color: 'var(--color-status-alert)' },
  { label: 'Fleets Tracked',    value: '—',   icon: Map,      color: 'var(--color-marine-300)' },
];

export default function DashboardPage() {
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
              {/* Skeleton bar */}
              <div className="mt-3 h-1 rounded-full skeleton" style={{ width: '60%' }} />
            </motion.div>
          );
        })}
      </div>

      {/* Placeholder content areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Fleet Activity', cols: 2, height: 280 },
          { title: 'Recent Alerts',  cols: 1, height: 280 },
        ].map((block) => (
          <motion.div
            key={block.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`rounded-xl p-5 ${block.cols === 2 ? 'lg:col-span-2' : ''}`}
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              minHeight: block.height,
            }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {block.title}
            </h2>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-8 skeleton rounded-lg" style={{ width: `${80 - j * 10}%` }} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
