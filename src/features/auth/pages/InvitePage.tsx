import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Accept Invitation</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Token: {token}</p>
      </motion.div>
    </div>
  );
}
