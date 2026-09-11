import { create } from "zustand";
import { apiListReps, serverRepToRep } from "./api";
import type { Rep } from "./types";

export type LogStatus = "idle" | "loading" | "ready" | "error";
/** server: 로그인 — 서버 기록의 사본 / guest: 로그인 전 — 이 브라우저에만 저장 */
export type LogMode = "server" | "guest";

/** 로그인 전에는 이만큼만 연습할 수 있다. 그 뒤로는 로그인해야 기록을 지키며 이어갈 수 있다 */
export const GUEST_REP_LIMIT = 5;

const GUEST_LOG_KEY = "reps.guest.v1";

export function readGuestLog(): Rep[] {
  try {
    const raw = localStorage.getItem(GUEST_LOG_KEY);
    return raw ? (JSON.parse(raw) as Rep[]) : [];
  } catch {
    return [];
  }
}

/** 로그인 후 서버로 옮기는 데 성공했을 때만 지운다 */
export function clearGuestLog() {
  try {
    localStorage.removeItem(GUEST_LOG_KEY);
  } catch {
    // ignore
  }
}

function saveGuestLog(reps: Rep[]) {
  try {
    localStorage.setItem(GUEST_LOG_KEY, JSON.stringify(reps));
  } catch {
    // 저장 실패해도 이번 방문 동안은 화면에 남는다
  }
}

type RepLogStore = {
  /** 오래된 것부터 최신 순. 모든 화면이 이 한 곳을 본다 */
  reps: Rep[];
  status: LogStatus;
  mode: LogMode | null;
  /** 서버에서 전체 기록을 다시 받아온다. 동시에 여러 번 불려도 요청은 하나만 나간다 */
  refresh: () => Promise<void>;
  /** 로그인 전: 이 브라우저에 저장된 게스트 기록을 불러온다 */
  loadGuest: () => void;
  /** 새 rep을 화면에 즉시 반영한다. 서버 모드에서는 이미 서버에 저장된 rep만 넣는다 */
  addRep: (rep: Rep) => void;
  removeRep: (id: string) => void;
  replaceRep: (id: string, rep: Rep) => void;
  /** 로그아웃 — 다른 사용자의 기록이 화면에 남지 않게 비운다 */
  reset: () => void;
};

let inflight: Promise<void> | null = null;
let generation = 0;

export const useRepLogStore = create<RepLogStore>((set, get) => {
  function update(next: Rep[]) {
    set({ reps: next });
    if (get().mode === "guest") saveGuestLog(next);
  }

  return {
    reps: [],
    status: "idle",
    mode: null,

    refresh: () => {
      if (inflight) return inflight;
      const gen = generation;
      set((s) => ({ status: s.status === "ready" && s.mode === "server" ? "ready" : "loading" }));
      const request: Promise<void> = apiListReps()
        .then((rows) => {
          if (gen !== generation) return;
          const reps = rows
            .map(serverRepToRep)
            .sort((a, b) => (a.committedAt ?? a.openedAt) - (b.committedAt ?? b.openedAt));
          set({ reps, status: "ready", mode: "server" });
        })
        .catch(() => {
          if (gen !== generation) return;
          set((s) => ({ status: s.status === "ready" && s.mode === "server" ? "ready" : "error" }));
        })
        .finally(() => {
          if (inflight === request) inflight = null;
        });
      inflight = request;
      return request;
    },

    loadGuest: () => {
      generation++;
      inflight = null;
      set({ reps: readGuestLog(), status: "ready", mode: "guest" });
    },

    addRep: (rep) => update([...get().reps, rep]),

    removeRep: (id) => update(get().reps.filter((r) => r.id !== id)),

    replaceRep: (id, rep) => update(get().reps.map((r) => (r.id === id ? rep : r))),

    reset: () => {
      generation++;
      inflight = null;
      set({ reps: [], status: "idle", mode: null });
    },
  };
});
