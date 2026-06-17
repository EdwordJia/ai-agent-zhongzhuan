import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  themeMode: "light" | "dark" | "auto";
  activePage: string;

  toggleSidebar: () => void;
  setThemeMode: (mode: UIState["themeMode"]) => void;
  setActivePage: (page: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  themeMode: "dark",
  activePage: "/",

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setThemeMode: (mode) => set({ themeMode: mode }),

  setActivePage: (page) => set({ activePage: page }),
}));
