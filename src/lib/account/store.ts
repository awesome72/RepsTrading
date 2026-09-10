import { create } from "zustand";
import type { GateLevel } from "@/lib/gate/types";

const STORAGE_KEY = "reps.account.v1";

export type SetupPreference = "pullback" | "breakout" | "both";

export type AccountState = {
  accountSize: number;
  riskPercent: number;
  setupPreference: SetupPreference;
  onboardingCompleted: boolean;
  gateLevel: GateLevel;
  /** 강등이 방금 일어났음을 한 번 안내하기 위한 타임스탬프 */
  lastDemotedAt: number | null;
};

const DEFAULT_STATE: AccountState = {
  accountSize: 10_000_000,
  riskPercent: 1,
  setupPreference: "pullback",
  onboardingCompleted: false,
  gateLevel: 1,
  lastDemotedAt: null,
};

type AccountStore = AccountState & {
  hydrated: boolean;
  hydrate: () => void;
  setAccountSize: (n: number) => void;
  setRiskPercent: (n: number) => void;
  setSetupPreference: (p: SetupPreference) => void;
  completeOnboarding: () => void;
  promote: () => void;
  demote: (now?: number) => void;
  acknowledgeDemotion: () => void;
};

function save(state: AccountState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as AccountState) : DEFAULT_STATE;
      set({ ...stored, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setAccountSize: (n) => {
    set((s) => {
      const next = { ...s, accountSize: n };
      save(next);
      return next;
    });
  },

  setRiskPercent: (n) => {
    set((s) => {
      const next = { ...s, riskPercent: n };
      save(next);
      return next;
    });
  },

  setSetupPreference: (p) => {
    set((s) => {
      const next = { ...s, setupPreference: p };
      save(next);
      return next;
    });
  },

  completeOnboarding: () => {
    set((s) => {
      const next = { ...s, onboardingCompleted: true };
      save(next);
      return next;
    });
  },

  promote: () => {
    set((s) => {
      const nextLevel = (s.gateLevel < 3 ? s.gateLevel + 1 : 3) as GateLevel;
      const next = { ...s, gateLevel: nextLevel };
      save(next);
      return next;
    });
  },

  demote: (now = Date.now()) => {
    set((s) => {
      const nextLevel = (s.gateLevel > 1 ? s.gateLevel - 1 : 1) as GateLevel;
      const next = { ...s, gateLevel: nextLevel, lastDemotedAt: now };
      save(next);
      return next;
    });
  },

  acknowledgeDemotion: () => {
    set((s) => {
      const next = { ...s, lastDemotedAt: null };
      save(next);
      return next;
    });
  },
}));
