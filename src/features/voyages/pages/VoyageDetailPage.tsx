import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
export default function VoyageDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Voyage Detail</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>ID: {id}</p>
      </motion.div>
    </div>
  );
}
