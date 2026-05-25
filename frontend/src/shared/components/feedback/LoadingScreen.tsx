import { motion } from 'framer-motion';
import { Anchor }  from 'lucide-react';
import { APP_NAME } from '@shared/utils/constants';

/**
 * Full-screen loading screen.
 * Shown during route-level Suspense (lazy page loads) and initial auth check.
 */
export function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--color-surface-base)' }}
    >
      {/* Animated logo */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent-cyan), var(--color-marine-400))',
          boxShadow: 'var(--shadow-glow-md)',
        }}
      >
        <Anchor size={28} color="white" strokeWidth={2} />
      </motion.div>

      {/* App name */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-sm font-medium tracking-widest uppercase"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.15em' }}
      >
        {APP_NAME}
      </motion.p>

      {/* Loading bar */}
      <motion.div
        className="w-40 h-0.5 rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-overlay)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--color-accent-cyan), var(--color-marine-400))' }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}
