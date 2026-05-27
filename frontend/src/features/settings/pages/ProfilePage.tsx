import { motion } from 'framer-motion';
export default function ProfilePage() {
  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Profile</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Your account settings</p>
      </motion.div>
    </div>
  );
}
