import { create } from "zustand";
import { persist } from "zustand/middleware";

/** UI state only. Server state lives in TanStack Query and nowhere else. */
interface UiState {
  railCollapsed: boolean;
  commandOpen: boolean;
  dark: boolean;
  toggleRail: () => void;
  setCommandOpen: (open: boolean) => void;
  toggleDark: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      railCollapsed: false,
      commandOpen: false,
      dark: false,
      toggleRail: () => set((s) => ({ railCollapsed: !s.railCollapsed })),
      setCommandOpen: (open) => set({ commandOpen: open }),
      toggleDark: () => set((s) => ({ dark: !s.dark })),
    }),
    {
      name: "assignx.portal.ui",
      partialize: (s) => ({ railCollapsed: s.railCollapsed, dark: s.dark }),
    },
  ),
);
