import { useEffect, type ReactNode } from 'react';
import { Sidebar }      from './Sidebar';
import { Header }       from './Header';
import { useUIStore }   from '@shared/stores/ui.store';
import { ConnectionStatus }  from '@shared/components/feedback/ConnectionStatus';
import { cn }                from '@shared/utils/cn';
import { realtimeService }   from '@shared/services/realtime.service';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Main authenticated app layout.
 * Sidebar + Header + scrollable content area.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    // Start realtime connection when entering the app shell
    realtimeService.connect();
    return () => {
      realtimeService.disconnect();
    };
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={cn('app-sidebar', collapsed && 'app-sidebar--collapsed')}>
        <Sidebar collapsed={collapsed} />
      </aside>

      {/* Main area */}
      <div className="app-main">
        <header className="app-header">
          <Header />
        </header>

        <main className="app-content" id="main-content">
          {children}
        </main>
      </div>

      {/* Floating realtime connection status banner */}
      <ConnectionStatus />
    </div>
  );
}
