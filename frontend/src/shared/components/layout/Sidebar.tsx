import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Ship, Layers, Route,
  Bell, BarChart3, Shield, Settings, ChevronRight,
  Anchor,
} from 'lucide-react';
import { cn }          from '@shared/utils/cn';
import { ROUTES }      from '@config/routes';
import { APP_NAME }    from '@shared/utils/constants';
import { useUIStore }  from '@shared/stores/ui.store';
import { useRealtimeStore } from '@shared/stores/realtime.store';

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  label:    string;
  icon:     React.ElementType;
  to:       string;
  badge?:   number;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, to: ROUTES.DASHBOARD, section: 'overview' },
  { label: 'Live Map',   icon: Map,             to: ROUTES.MAP,       section: 'overview' },
  { label: 'Vessels',    icon: Ship,            to: ROUTES.VESSELS,   section: 'tracking' },
  { label: 'Fleets',     icon: Layers,          to: ROUTES.FLEETS,    section: 'tracking' },
  { label: 'Voyages',    icon: Route,           to: ROUTES.VOYAGES,   section: 'tracking' },
  { label: 'Alerts',     icon: Bell,            to: ROUTES.ALERTS,    section: 'monitoring' },
  { label: 'Geofences',  icon: Shield,          to: ROUTES.GEOFENCES, section: 'monitoring' },
  { label: 'Analytics',  icon: BarChart3,       to: ROUTES.ANALYTICS, section: 'analytics' },
  { label: 'Settings',   icon: Settings,        to: ROUTES.SETTINGS,  section: 'settings' },
];

const SECTION_LABELS: Record<string, string> = {
  overview:   'Overview',
  tracking:   'Fleet Tracking',
  monitoring: 'Monitoring',
  analytics:  'Analytics',
  settings:   'Configuration',
};

export function Sidebar({ collapsed }: SidebarProps) {
  const unreadAlertCount = useRealtimeStore((s) => s.unreadAlertCount);

  // Group items by section
  const sections = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    const sec = item.section ?? 'other';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(item);
    return acc;
  }, {});

  return (
    <nav className="flex flex-col h-full" aria-label="Main navigation">
      {/* ── Logo ──────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent-cyan), var(--color-marine-400))',
            boxShadow: 'var(--shadow-glow-sm)',
          }}
        >
          <Anchor size={16} color="white" strokeWidth={2.5} />
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.span
              key="logo-text"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="text-base font-bold whitespace-nowrap overflow-hidden"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {APP_NAME}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation items ──────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-6">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            {/* Section label */}
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  key={`label-${section}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {SECTION_LABELS[section]}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Nav links */}
            <ul className="space-y-0.5 px-2">
              {items.map((item) => {
                const badgeCount = item.label === 'Alerts' ? unreadAlertCount : (item.badge ?? 0);
                const Icon = item.icon;

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive: navActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                          'transition-all duration-150 relative group',
                          navActive
                            ? 'text-accent'
                            : 'hover:text-primary',
                        )
                      }
                      style={({ isActive: navActive }) => ({
                        background: navActive
                          ? 'var(--color-surface-active)'
                          : 'transparent',
                        color: navActive
                          ? 'var(--color-text-accent)'
                          : 'var(--color-text-secondary)',
                      })}
                      title={collapsed ? item.label : undefined}
                    >
                      {({ isActive: navActive }) => (
                        <>
                          {/* Active indicator bar */}
                          {navActive && (
                            <motion.div
                              layoutId="sidebar-active"
                              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                              style={{ background: 'var(--color-accent-cyan)' }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          )}

                          {/* Icon */}
                          <Icon
                            size={18}
                            className="flex-shrink-0"
                            style={{
                              color: navActive
                                ? 'var(--color-accent-cyan)'
                                : 'var(--color-text-tertiary)',
                            }}
                          />

                          {/* Label */}
                          <AnimatePresence>
                            {!collapsed && (
                              <motion.span
                                key={`label-${item.to}`}
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.18 }}
                                className="flex-1 whitespace-nowrap overflow-hidden"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Badge */}
                          {badgeCount > 0 && !collapsed && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                              style={{
                                background: 'var(--color-severity-critical)',
                                color: 'white',
                              }}
                            >
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}

                          {/* Collapsed badge dot */}
                          {badgeCount > 0 && collapsed && (
                            <span
                              className="absolute top-1 right-1 w-2 h-2 rounded-full"
                              style={{ background: 'var(--color-severity-critical)' }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Collapse toggle ───────────────────── */}
      <div
        className="p-2 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border-subtle)' }}
      >
        <button
          onClick={() => useUIStore.getState().toggleSidebar()}
          className="w-full flex items-center justify-center p-2 rounded-lg transition-colors duration-150"
          style={{ color: 'var(--color-text-tertiary)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronRight size={16} />
          </motion.div>
        </button>
      </div>
    </nav>
  );
}
