import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
export default function GeofencesPage() {
  return (
    <div className="p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Geofences</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Define geographic monitoring zones</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="rounded-xl p-8 flex flex-col items-center gap-3"
        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-subtle)', minHeight: 300 }}>
        <Shield size={40} style={{ color: 'var(--color-text-tertiary)' }} />
        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No geofences</p>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Draw zones on the map to monitor vessel activity</p>
      </motion.div>
    </div>
  );
}
