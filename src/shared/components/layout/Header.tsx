import { Bell, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore }        from '@shared/stores/ui.store';
import { useRealtimeStore }  from '@shared/stores/realtime.store';
import { useCurrentUser }    from '@features/auth/stores/auth.store';
import { useIsMobile }       from '@shared/hooks/useMediaQuery';

/**
 * Top application header.
 * Contains: mobile menu toggle, search trigger, alert bell, user avatar.
 */
export function Header() {
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const toggleSidebar      = useUIStore((s) => s.toggleSidebar);
  const unreadCount        = useRealtimeStore((s) => s.unreadAlertCount);
  const clearUnread        = useRealtimeStore((s) => s.clearUnreadCount);
  const currentUser        = useCurrentUser();
  const isMobile           = useIsMobile();

  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (currentUser?.email?.[0].toUpperCase() ?? '?');

  return (
    <div className="flex items-center justify-between h-full px-4 gap-4">
      {/* ── Left: mobile menu + breadcrumb ──── */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* ── Center: search trigger ───────────── */}
      <button
        onClick={openCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-150 flex-1 max-w-sm"
        style={{
          background: 'var(--color-surface-overlay)',
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-tertiary)',
        }}
        aria-label="Open command palette (⌘K)"
      >
        <Search size={14} />
        <span className="text-sm flex-1 text-left">Search vessels, fleets…</span>
        <kbd
          className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono"
          style={{
            background: 'var(--color-surface-base)',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* ── Right: alerts + avatar ───────────── */}
      <div className="flex items-center gap-2">
        {/* Alert bell */}
        <button
          onClick={clearUnread}
          className="relative p-2 rounded-lg transition-colors duration-150"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label={`Alerts${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell size={18} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 min-w-[16px] h-4 text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                style={{ background: 'var(--color-severity-critical)', color: 'white' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="status-dot status-dot--underway pulse-live" />
          <span className="text-xs font-medium" style={{ color: 'var(--color-status-underway)' }}>
            LIVE
          </span>
        </div>

        {/* Avatar */}
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-marine-600), var(--color-marine-400))',
            color: 'white',
          }}
          aria-label="User menu"
        >
          {initials}
        </button>
      </div>
    </div>
  );
}
