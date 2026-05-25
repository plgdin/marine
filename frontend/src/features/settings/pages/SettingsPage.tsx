import { motion } from 'framer-motion';
export default function SettingsPage() {
  return (
    <div className="p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Organization configuration</p>
      </motion.div>
    </div>
  );
}
