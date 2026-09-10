import { create } from "zustand";
import type { Rep } from "./types";

const STORAGE_KEY = "reps.journal.v1";

type RepLogStore = {
  reps: Rep[];
  hydrated: boolean;
  /** localStorage 읽기는 클라이언트에서만 가능하므로 마운트 이후에 호출한다 */
  hydrate: () => void;
  addRep: (rep: Rep) => void;
  clear: () => void;
};

function save(reps: Rep[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reps));
  } catch {
    // 저장 실패해도 이번 세션 상태는 유지한다
  }
}

export const useRepLogStore = create<RepLogStore>((set, get) => ({
  reps: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const reps: Rep[] = raw ? JSON.parse(raw) : [];
      set({ reps, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  addRep: (rep) => {
    set((s) => {
      const reps = [...s.reps, rep];
      save(reps);
      return { reps };
    });
  },

  clear: () => {
    set({ reps: [] });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
}));
