import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
export default function AlertsPage() {
  return (
    <div className="p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Alerts</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Alert rules and event log</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="rounded-xl p-8 flex flex-col items-center gap-3"
        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-subtle)', minHeight: 300 }}>
        <Bell size={40} style={{ color: 'var(--color-text-tertiary)' }} />
        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No alerts</p>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Configure alert rules to start monitoring</p>
      </motion.div>
    </div>
  );
}
