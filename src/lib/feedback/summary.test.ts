import { describe, expect, it } from "vitest";
import { computeHistorySummary } from "./summary";
import type { Rep } from "@/lib/rep/types";

function tradedRep(r: number, adhered: boolean): Rep {
  return {
    id: `r-${Math.random()}`,
    scenarioId: "s",
    seed: 1,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: 0,
    plan: { setupChoice: "pullback", entryPrice: 100, stopPrice: 90, targetPrice: 120, targetR: 2 },
    adhered,
    exitReason: "target",
    decisionGrade: adhered ? "A" : "C",
    result: { exitPrice: 100 + r * 10, rMultiple: r },
  };
}

describe("computeHistorySummary", () => {
  it("이전 기록이 없으면 이전 값은 0이다", () => {
    const s = computeHistorySummary([], tradedRep(1, true), null);
    expect(s.adherenceBefore).toBe(0);
    expect(s.adherenceAfter).toBe(1);
  });

  it("이번 rep을 포함해 이후 값을 계산한다", () => {
    const before = [tradedRep(1, true), tradedRep(-1, false)];
    const s = computeHistorySummary(before, tradedRep(1, true), null);
    expect(s.adherenceBefore).toBe(0.5);
    expect(s.adherenceAfter).toBeCloseTo(2 / 3);
  });

  it("message는 이번 rep까지 포함한 기록으로 getFeedback을 부른 것과 같다", () => {
    // D등급 rep을 추가하면 "손실 한도" 규칙이 최우선으로 걸려야 한다
    const dRep: Rep = { ...tradedRep(-2, false), decisionGrade: "D" };
    const s = computeHistorySummary([tradedRep(1, true)], dRep, null);
    expect(s.message).toContain("손실 한도");
  });

  it("tradedAfter는 지나간 것을 빼고 이번 rep까지 센다", () => {
    const pass: Rep = { ...tradedRep(0, true), exitReason: "pass" };
    expect(computeHistorySummary([tradedRep(1, true), pass], tradedRep(1, true), null).tradedAfter).toBe(2);
    expect(computeHistorySummary([tradedRep(1, true)], pass, null).tradedAfter).toBe(1);
  });

  it("dailyGoal이 있으면 오늘 진행 상황이 반영된 기본 메시지가 나온다", () => {
    const now = new Date(2026, 8, 15, 12).getTime();
    const s = computeHistorySummary([], tradedRep(1, true), 10, now);
    expect(s.message).toContain("오늘");
  });
});
