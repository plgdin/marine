import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw }  from 'lucide-react';
import { useRealtimeStore }          from '@shared/stores/realtime.store';

/**
 * Floating connection status banner.
 * Appears at the bottom of the screen when realtime is disconnected or reconnecting.
 * Hides automatically when connected.
 */
export function ConnectionStatus() {
  const status = useRealtimeStore((s) => s.connectionStatus);
  const visible = status !== 'connected';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="connection-banner"
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0,  x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="connection-banner"
          style={{
            background: status === 'reconnecting'
              ? 'rgba(255, 171, 0, 0.15)'
              : 'rgba(255, 23, 68, 0.15)',
            border: `1px solid ${status === 'reconnecting' ? 'rgba(255,171,0,0.3)' : 'rgba(255,23,68,0.3)'}`,
            color: status === 'reconnecting'
              ? 'var(--color-accent-amber)'
              : 'var(--color-severity-critical)',
          }}
          role="status"
          aria-live="polite"
        >
          {status === 'reconnecting' ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw size={12} />
              </motion.div>
              Reconnecting to live feed…
            </>
          ) : (
            <>
              <WifiOff size={12} />
              Live feed disconnected
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
