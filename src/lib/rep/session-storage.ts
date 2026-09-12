import { generateScenario, type Scenario } from "@/lib/market/scenario";
import { useRepStore } from "@/lib/rep/store";
import type { Rep } from "@/lib/rep/types";

export const PRACTICE_SESSION_KEY = "reps.activeSession.v1";

export type PersistedSession = {
  scenarioSeed: number;
  repId: string | null;
  revealCount: number;
  rep: Rep;
};

/** 재생 중(COMMITTED/EXECUTED) 새로고침해도 이어서 볼 수 있도록 세션에 남긴다 */
export function persistPracticeSession(scenario: Scenario | null, repId: string | null, revealCount: number) {
  const rep = useRepStore.getState().rep;
  try {
    if (!scenario || !rep || rep.state === "WATCHING" || rep.state === "REVEALED") {
      sessionStorage.removeItem(PRACTICE_SESSION_KEY);
      return;
    }
    const payload: PersistedSession = { scenarioSeed: scenario.seed, repId, revealCount, rep };
    sessionStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage 접근 불가 — 복구 기능만 못 쓸 뿐, 연습 자체는 계속된다
  }
}

export function clearPracticeSession() {
  try {
    sessionStorage.removeItem(PRACTICE_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function tryRestorePracticeSession(): {
  scenario: Scenario;
  repId: string | null;
  revealCount: number;
  rep: Rep;
} | null {
  try {
    const raw = sessionStorage.getItem(PRACTICE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    // 채점까지 끝난 rep은 복구 대상이 아니다 (다음 연습으로 넘어가면 그만이다)
    const resumable = parsed.rep && (parsed.rep.state === "COMMITTED" || parsed.rep.state === "EXECUTED");
    if (!resumable) return null;
    const scenario = generateScenario(parsed.scenarioSeed);
    return { scenario, repId: parsed.repId, revealCount: parsed.revealCount, rep: parsed.rep };
  } catch {
    return null;
  }
}
