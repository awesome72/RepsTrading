import { create } from "zustand";
import { apiListReps, serverRepToRep } from "./api";
import type { Rep } from "./types";

export type LogStatus = "idle" | "loading" | "ready" | "error";

type RepLogStore = {
  /** 서버 기록의 사본 — 오래된 것부터 최신 순. 모든 화면이 이 한 곳을 본다 */
  reps: Rep[];
  status: LogStatus;
  /** 서버에서 전체 기록을 다시 받아온다. 동시에 여러 번 불려도 요청은 하나만 나간다 */
  refresh: () => Promise<void>;
  /** 서버에 이미 저장된 rep을 화면에 즉시 반영한다 (다시 받아오지 않고) */
  addRep: (rep: Rep) => void;
  removeRep: (id: string) => void;
  replaceRep: (id: string, rep: Rep) => void;
  /** 로그아웃 — 다른 사용자의 기록이 화면에 남지 않게 비운다 */
  reset: () => void;
};

let inflight: Promise<void> | null = null;
let generation = 0;

export const useRepLogStore = create<RepLogStore>((set) => ({
  reps: [],
  status: "idle",

  refresh: () => {
    if (inflight) return inflight;
    const gen = generation;
    set((s) => ({ status: s.status === "ready" ? "ready" : "loading" }));
    const request: Promise<void> = apiListReps()
      .then((rows) => {
        if (gen !== generation) return;
        const reps = rows
          .map(serverRepToRep)
          .sort((a, b) => (a.committedAt ?? a.openedAt) - (b.committedAt ?? b.openedAt));
        set({ reps, status: "ready" });
      })
      .catch(() => {
        if (gen !== generation) return;
        set((s) => ({ status: s.status === "ready" ? "ready" : "error" }));
      })
      .finally(() => {
        if (inflight === request) inflight = null;
      });
    inflight = request;
    return request;
  },

  addRep: (rep) => set((s) => ({ reps: [...s.reps, rep] })),

  removeRep: (id) => set((s) => ({ reps: s.reps.filter((r) => r.id !== id) })),

  replaceRep: (id, rep) => set((s) => ({ reps: s.reps.map((r) => (r.id === id ? rep : r)) })),

  reset: () => {
    generation++;
    inflight = null;
    set({ reps: [], status: "idle" });
  },
}));
