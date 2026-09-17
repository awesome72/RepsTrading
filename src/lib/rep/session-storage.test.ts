import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRACTICE_SESSION_KEY,
  clearPracticeSession,
  persistPracticeSession,
  tryRestorePracticeSession,
} from "./session-storage";
import { useRepStore } from "./store";
import { generateScenario } from "@/lib/market/scenario";
import type { Rep } from "./types";

const SEED = 42;

function fakeRep(overrides: Partial<Rep> = {}): Rep {
  return {
    id: "r1",
    scenarioId: "s1",
    seed: SEED,
    setupLabel: "pullback",
    state: "COMMITTED",
    openedAt: Date.now(),
    plan: { setupChoice: "pullback", entryPrice: 100, stopPrice: 90, targetPrice: 120, targetR: 2 },
    ...overrides,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  useRepStore.setState({ rep: null });
});

describe("persistPracticeSession", () => {
  it("COMMITTED 상태면 세션에 저장한다", () => {
    useRepStore.setState({ rep: fakeRep({ state: "COMMITTED" }) });
    persistPracticeSession(generateScenario(SEED), "rep-id", 5);

    const raw = sessionStorage.getItem(PRACTICE_SESSION_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({ scenarioSeed: SEED, repId: "rep-id", revealCount: 5 });
  });

  it("EXECUTED 상태에서도 저장한다", () => {
    useRepStore.setState({ rep: fakeRep({ state: "EXECUTED" }) });
    persistPracticeSession(generateScenario(SEED), "rep-id", 10);

    expect(sessionStorage.getItem(PRACTICE_SESSION_KEY)).not.toBeNull();
  });

  it("WATCHING 상태면 저장된 세션을 지운다", () => {
    sessionStorage.setItem(PRACTICE_SESSION_KEY, "stale");
    useRepStore.setState({ rep: fakeRep({ state: "WATCHING" }) });
    persistPracticeSession(generateScenario(SEED), null, 0);

    expect(sessionStorage.getItem(PRACTICE_SESSION_KEY)).toBeNull();
  });

  it("REVEALED 상태면 저장된 세션을 지운다", () => {
    sessionStorage.setItem(PRACTICE_SESSION_KEY, "stale");
    useRepStore.setState({ rep: fakeRep({ state: "REVEALED" }) });
    persistPracticeSession(generateScenario(SEED), null, 0);

    expect(sessionStorage.getItem(PRACTICE_SESSION_KEY)).toBeNull();
  });

  it("scenario가 없으면 세션을 지운다", () => {
    sessionStorage.setItem(PRACTICE_SESSION_KEY, "stale");
    useRepStore.setState({ rep: fakeRep({ state: "COMMITTED" }) });
    persistPracticeSession(null, null, 0);

    expect(sessionStorage.getItem(PRACTICE_SESSION_KEY)).toBeNull();
  });

  it("store에 rep이 없으면 세션을 지운다", () => {
    sessionStorage.setItem(PRACTICE_SESSION_KEY, "stale");
    useRepStore.setState({ rep: null });
    persistPracticeSession(generateScenario(SEED), null, 0);

    expect(sessionStorage.getItem(PRACTICE_SESSION_KEY)).toBeNull();
  });

  it("sessionStorage 접근이 막혀도 던지지 않는다 — 연습 자체는 계속돼야 한다", () => {
    useRepStore.setState({ rep: fakeRep({ state: "COMMITTED" }) });
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => persistPracticeSession(generateScenario(SEED), null, 0)).not.toThrow();
    spy.mockRestore();
  });
});

describe("clearPracticeSession", () => {
  it("저장된 세션을 지운다", () => {
    sessionStorage.setItem(PRACTICE_SESSION_KEY, "x");
    clearPracticeSession();
    expect(sessionStorage.getItem(PRACTICE_SESSION_KEY)).toBeNull();
  });

  it("접근이 막혀도 던지지 않는다", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearPracticeSession()).not.toThrow();
    spy.mockRestore();
  });
});

describe("tryRestorePracticeSession", () => {
  it("저장된 게 없으면 null", () => {
    expect(tryRestorePracticeSession()).toBeNull();
  });

  it("깨진 JSON이면 던지지 않고 null을 준다", () => {
    sessionStorage.setItem(PRACTICE_SESSION_KEY, "{not json");
    expect(tryRestorePracticeSession()).toBeNull();
  });

  it("COMMITTED 상태를 그대로 복원한다 — 시나리오는 seed로 재생성해도 완전히 같다", () => {
    useRepStore.setState({ rep: fakeRep({ state: "COMMITTED" }) });
    persistPracticeSession(generateScenario(SEED), "rep-id", 7);

    const restored = tryRestorePracticeSession();
    expect(restored).not.toBeNull();
    expect(restored!.repId).toBe("rep-id");
    expect(restored!.revealCount).toBe(7);
    expect(restored!.rep.state).toBe("COMMITTED");
    expect(restored!.scenario).toEqual(generateScenario(SEED));
  });

  it("EXECUTED 상태도 복원 대상이다", () => {
    useRepStore.setState({ rep: fakeRep({ state: "EXECUTED" }) });
    persistPracticeSession(generateScenario(SEED), "rep-id", 12);

    expect(tryRestorePracticeSession()?.rep.state).toBe("EXECUTED");
  });

  it("채점이 끝난(GRADED/REVEALED) rep은 복원 대상이 아니다", () => {
    sessionStorage.setItem(
      PRACTICE_SESSION_KEY,
      JSON.stringify({
        scenarioSeed: SEED,
        repId: "x",
        revealCount: 3,
        rep: fakeRep({ state: "GRADED" }),
      })
    );
    expect(tryRestorePracticeSession()).toBeNull();
  });

  it("WATCHING 상태로 저장돼 있어도 복원 대상이 아니다", () => {
    sessionStorage.setItem(
      PRACTICE_SESSION_KEY,
      JSON.stringify({
        scenarioSeed: SEED,
        repId: null,
        revealCount: 0,
        rep: fakeRep({ state: "WATCHING" }),
      })
    );
    expect(tryRestorePracticeSession()).toBeNull();
  });
});
