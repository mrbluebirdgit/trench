import { create } from "zustand";
import { persist } from "zustand/middleware";

type WatchState = {
  items: string[];
  hydrated: boolean;
  toggle: (mint: string) => void;
  has: (mint: string) => boolean;
  setHydrated: () => void;
};

export const useWatch = create<WatchState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      toggle: (mint) =>
        set((s) => ({
          items: s.items.includes(mint) ? s.items.filter((m) => m !== mint) : [mint, ...s.items].slice(0, 80),
        })),
      has: (mint) => get().items.includes(mint),
      setHydrated: () => set({ hydrated: true }),
    }),
    { name: "trench-watch", partialize: (s) => ({ items: s.items }) },
  ),
);
