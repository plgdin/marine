import { motion } from 'framer-motion';
export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Analytics</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Fleet analytics and reporting</p>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['Fleet Utilization', 'Voyage Performance', 'Port Calls', 'Alert Trends'].map((title, i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-xl p-5"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-subtle)', minHeight: 200 }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
            <div className="h-28 skeleton rounded-lg" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
