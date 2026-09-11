import type { GateLevel } from "@/lib/gate/types";
import type { GateTransition } from "@/lib/gate/rules";
import type { SetupPreference } from "./store";

export type AccountSettings = {
  accountSize: number;
  riskPercent: number;
  setupPreference: SetupPreference;
  onboardingCompleted: boolean;
};

export type ServerAccount = {
  /** 서버에 아직 설정 행이 없으면 null (첫 로그인) */
  settings: (AccountSettings & { updatedAt: number }) | null;
  gateLevel: GateLevel;
};

export const SETUP_PREFERENCES: SetupPreference[] = ["pullback", "breakout", "both"];

export function isValidSettings(s: Partial<AccountSettings>): s is AccountSettings {
  return (
    typeof s.accountSize === "number" &&
    Number.isFinite(s.accountSize) &&
    s.accountSize > 0 &&
    typeof s.riskPercent === "number" &&
    s.riskPercent > 0 &&
    s.riskPercent <= 10 &&
    SETUP_PREFERENCES.includes(s.setupPreference as SetupPreference) &&
    typeof s.onboardingCompleted === "boolean"
  );
}

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `요청이 실패했습니다 (${res.status})`);
  }
  return body as T;
}

export async function apiGetAccount(): Promise<ServerAccount> {
  return asJson(await fetch("/api/account"));
}

export async function apiSaveAccount(settings: AccountSettings): Promise<{ updatedAt: number }> {
  return asJson(
    await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
  );
}

export async function apiEvaluateGate(): Promise<{
  gateLevel: GateLevel;
  transition: GateTransition | null;
}> {
  return asJson(await fetch("/api/account/gate", { method: "POST" }));
}
