import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { APP_NAME, APP_TAGLINE } from '@shared/utils/constants';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Authentication page layout.
 * Split: left brand panel, right form panel.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-surface-base)' }}>

      {/* ── Left: Brand Panel ─────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, var(--color-marine-900) 0%, var(--color-marine-950) 100%)',
          borderRight: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(var(--color-marine-600) 1px, transparent 1px),
              linear-gradient(90deg, var(--color-marine-600) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow orb */}
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--color-accent-cyan)' }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-cyan), var(--color-marine-400))',
              boxShadow: 'var(--shadow-glow-sm)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.68 9.9a19.79 19.79 0 0 1-3.07-8.68A2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 5.56 5.56l1.26-1.26a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {APP_NAME}
          </span>
        </motion.div>

        {/* Tagline block */}
        <motion.div
          className="relative z-10 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <p className="text-4xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
            Global Maritime<br />
            <span className="gradient-text">Intelligence</span>
          </p>
          <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
            {APP_TAGLINE}. Real-time vessel tracking,<br />
            fleet analytics, and enterprise insights.
          </p>
        </motion.div>

        {/* Feature bullets */}
        <motion.div
          className="relative z-10 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {[
            'Real-time AIS vessel tracking',
            'Multi-fleet monitoring & analytics',
            'Geofencing & intelligent alerts',
            'Enterprise-grade security & RBAC',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-accent-cyan)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {item}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right: Form Panel ─────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-accent-cyan), var(--color-marine-400))' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.68 9.9a19.79 19.79 0 0 1-3.07-8.68A2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 5.56 5.56l1.26-1.26a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {APP_NAME}
            </span>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
