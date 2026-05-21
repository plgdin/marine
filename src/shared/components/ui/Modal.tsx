import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useClickOutside } from '@shared/hooks/useClickOutside';
import { useKeyboard } from '@shared/hooks/useKeyboard';
import { cn } from '@shared/utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, className, hideCloseButton }: ModalProps) {
  const modalRef = useClickOutside<HTMLDivElement>(onClose);
  useKeyboard('Escape', () => { if (isOpen) onClose(); });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-marine-950/80 backdrop-blur-sm"
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full max-w-lg rounded-2xl border border-border-default shadow-modal',
              'bg-surface-raised overflow-hidden',
              className,
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                {!hideCloseButton && (
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-text-tertiary hover:bg-surface-overlay hover:text-text-primary transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
