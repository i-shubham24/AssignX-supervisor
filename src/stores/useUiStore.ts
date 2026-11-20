import { create } from "zustand";
import { persist } from "zustand/middleware";

/** UI state only. Server state lives in TanStack Query and nowhere else. */
export interface UiState {
  railCollapsed: boolean;
  commandOpen: boolean;
  dark: boolean;
  themeMode: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  showShortcuts: boolean;
  relativeTime: boolean;
  soundAlerts: boolean;
  toggleRail: () => void;
  setRailCollapsed: (collapsed: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  toggleDark: () => void;
  setDark: (dark: boolean) => void;
  setThemeMode: (mode: "light" | "dark" | "system") => void;
  setDensity: (density: "comfortable" | "compact") => void;
  setShowShortcuts: (val: boolean) => void;
  setRelativeTime: (val: boolean) => void;
  setSoundAlerts: (val: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      railCollapsed: false,
      commandOpen: false,
      dark: false,
      themeMode: "light",
      density: "comfortable",
      showShortcuts: true,
      relativeTime: true,
      soundAlerts: true,
      toggleRail: () => set((s) => ({ railCollapsed: !s.railCollapsed })),
      setRailCollapsed: (collapsed) => set({ railCollapsed: collapsed }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      toggleDark: () =>
        set((s) => {
          const next = !s.dark;
          return { dark: next, themeMode: next ? "dark" : "light" };
        }),
      setDark: (dark) => set({ dark, themeMode: dark ? "dark" : "light" }),
      setThemeMode: (mode) =>
        set(() => {
          let isDark = mode === "dark";
          if (mode === "system" && typeof window !== "undefined") {
            isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          }
          return { themeMode: mode, dark: isDark };
        }),
      setDensity: (density) => set({ density }),
      setShowShortcuts: (showShortcuts) => set({ showShortcuts }),
      setRelativeTime: (relativeTime) => set({ relativeTime }),
      setSoundAlerts: (soundAlerts) => set({ soundAlerts }),
    }),
    {
      name: "assignx.portal.ui",
      partialize: (s) => ({
        railCollapsed: s.railCollapsed,
        dark: s.dark,
        themeMode: s.themeMode,
        density: s.density,
        showShortcuts: s.showShortcuts,
        relativeTime: s.relativeTime,
        soundAlerts: s.soundAlerts,
      }),
    },
  ),
);
