import { create } from "zustand";
import type { GateLevel } from "@/lib/gate/types";
import { apiGetAccount, apiSaveAccount, type AccountSettings } from "./api";

/** 로그인 전 온보딩에서 고른 값을 로그인할 때까지 들고 있는 임시 보관소 */
const STORAGE_KEY = "reps.account.v1";

export type SetupPreference = "pullback" | "breakout" | "both";

type LocalCache = AccountSettings & {
  /** 이 기기에서 온보딩을 마친 시각 — 서버 값보다 최신이면 서버에 올린다 */
  settingsUpdatedAt: number | null;
};

const DEFAULT_CACHE: LocalCache = {
  accountSize: 10_000_000,
  riskPercent: 1,
  setupPreference: "pullback",
  onboardingCompleted: false,
  settingsUpdatedAt: null,
};

type AccountStore = LocalCache & {
  /** 게이트 단계는 서버가 판정한 값만 쓴다. 로컬에 따로 저장하지 않는다 */
  gateLevel: GateLevel;
  /** 서버에서 게이트 단계를 받아왔는지 — 받기 전에는 단계 표시를 하지 않는다 */
  serverSynced: boolean;
  /** 서버 동기화가 실패했는가 — 실패해도 연습은 로컬 설정으로 계속할 수 있어야 한다 */
  syncFailed: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setAccountSize: (n: number) => void;
  setRiskPercent: (n: number) => void;
  setSetupPreference: (p: SetupPreference) => void;
  completeOnboarding: () => void;
  /** 온보딩 이후 설정 화면에서 값을 바꾼 뒤 호출한다. 실패(주로 게스트의 401)는 호출한 쪽에서 처리한다 */
  saveSettings: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  setGateLevel: (level: GateLevel) => void;
  reset: () => void;
};

function pickCache(s: LocalCache): LocalCache {
  return {
    accountSize: s.accountSize,
    riskPercent: s.riskPercent,
    setupPreference: s.setupPreference,
    onboardingCompleted: s.onboardingCompleted,
    settingsUpdatedAt: s.settingsUpdatedAt,
  };
}

function pickSettings(s: AccountSettings): AccountSettings {
  return {
    accountSize: s.accountSize,
    riskPercent: s.riskPercent,
    setupPreference: s.setupPreference,
    onboardingCompleted: s.onboardingCompleted,
  };
}

function save(cache: LocalCache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export const useAccountStore = create<AccountStore>((set, get) => {
  function update(patch: Partial<LocalCache>) {
    set(patch);
    save(pickCache(get()));
  }

  async function persist() {
    const { updatedAt } = await apiSaveAccount(pickSettings(get()));
    update({ settingsUpdatedAt: updatedAt });
  }

  return {
    ...DEFAULT_CACHE,
    gateLevel: 1,
    serverSynced: false,
    syncFailed: false,
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as Partial<LocalCache>) : {};
        set({ ...pickCache({ ...DEFAULT_CACHE, ...stored }), hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    setAccountSize: (n) => update({ accountSize: n }),
    setRiskPercent: (n) => update({ riskPercent: n }),
    setSetupPreference: (p) => update({ setupPreference: p }),

    completeOnboarding: () => {
      update({ onboardingCompleted: true, settingsUpdatedAt: Date.now() });
      // 로그인 전이면 401로 실패한다 — 그 경우 로그인 직후 syncWithServer가 올린다
      persist().catch(() => {});
    },

    saveSettings: () => {
      update({ settingsUpdatedAt: Date.now() });
      return persist();
    },

    syncWithServer: async () => {
      get().hydrate();
      set({ syncFailed: false });
      try {
        const server = await apiGetAccount();
        const local = get();

        const localIsNewer =
          local.onboardingCompleted &&
          (!server.settings ||
            (local.settingsUpdatedAt !== null && local.settingsUpdatedAt > server.settings.updatedAt));

        if (localIsNewer) {
          const { updatedAt } = await apiSaveAccount(pickSettings(local));
          update({ settingsUpdatedAt: updatedAt });
        } else if (server.settings) {
          update({ ...pickSettings(server.settings), settingsUpdatedAt: server.settings.updatedAt });
        }

        set({ gateLevel: server.gateLevel, serverSynced: true });
      } catch (e) {
        set({ syncFailed: true });
        throw e;
      }
    },

    setGateLevel: (level) => set({ gateLevel: level }),

    reset: () => {
      // 같은 브라우저로 다른 사람이 로그인했을 때 이전 사용자의 설정이 올라가지 않게 비운다
      set({ ...DEFAULT_CACHE, gateLevel: 1, serverSynced: false, syncFailed: false });
      save(DEFAULT_CACHE);
    },
  };
});
