import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:       string;
  type:     ToastType;
  message:  string;
  duration: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string) => void;
  error:   (message: string) => void;
  warning: (message: string) => void;
  info:    (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ── Icon map ─────────────────────────────
const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const COLORS: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: 'rgba(0,230,118,0.1)',  icon: 'var(--color-severity-success)',  border: 'rgba(0,230,118,0.25)' },
  error:   { bg: 'rgba(255,23,68,0.1)',  icon: 'var(--color-severity-critical)', border: 'rgba(255,23,68,0.25)' },
  warning: { bg: 'rgba(255,171,0,0.1)', icon: 'var(--color-severity-warning)',  border: 'rgba(255,171,0,0.25)' },
  info:    { bg: 'rgba(64,196,255,0.1)', icon: 'var(--color-severity-info)',    border: 'rgba(64,196,255,0.25)' },
};

// ── Provider ─────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast,
    success: (msg) => toast('success', msg),
    error:   (msg) => toast('error',   msg),
    warning: (msg) => toast('warning', msg),
    info:    (msg) => toast('info',    msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast stack */}
      <div
        className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon   = ICONS[t.type];
            const colors = COLORS[t.type];

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0,  scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl max-w-sm shadow-lg"
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  backdropFilter: 'blur(12px)',
                  minWidth: '280px',
                }}
                role="alert"
              >
                <Icon size={18} style={{ color: colors.icon, flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  {t.message}
                </p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
