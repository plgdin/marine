import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SIDEBAR_COLLAPSED_KEY } from '@shared/utils/constants';

// ── Types ────────────────────────────────
interface UIState {
  sidebarCollapsed:     boolean;
  commandPaletteOpen:   boolean;
  mobileNavOpen:        boolean;
}

interface UIActions {
  setSidebarCollapsed:   (collapsed: boolean) => void;
  toggleSidebar:         () => void;
  openCommandPalette:    () => void;
  closeCommandPalette:   () => void;
  toggleCommandPalette:  () => void;
  openMobileNav:         () => void;
  closeMobileNav:        () => void;
}

type UIStore = UIState & UIActions;

// ── Store ────────────────────────────────
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      sidebarCollapsed:   false,
      commandPaletteOpen: false,
      mobileNavOpen:      false,

      // Actions
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      openCommandPalette: () =>
        set({ commandPaletteOpen: true }),

      closeCommandPalette: () =>
        set({ commandPaletteOpen: false }),

      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      openMobileNav: () =>
        set({ mobileNavOpen: true }),

      closeMobileNav: () =>
        set({ mobileNavOpen: false }),
    }),
    {
      name:    SIDEBAR_COLLAPSED_KEY,
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
