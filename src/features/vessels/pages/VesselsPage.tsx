import { motion } from 'framer-motion';
import { Ship } from 'lucide-react';
export default function VesselsPage() {
  return (
    <div className="p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Vessels</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Manage and track your vessel fleet</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-subtle)', minHeight: 300 }}>
        <Ship size={40} style={{ color: 'var(--color-text-tertiary)' }} />
        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No vessels yet</p>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Add vessels or connect an AIS feed to start tracking</p>
      </motion.div>
    </div>
  );
}
