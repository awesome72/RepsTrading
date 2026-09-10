import { describe, expect, it } from "vitest";
import { checkDemotion, evaluateGate, GATE_TARGETS } from "./rules";
import type { DecisionGrade, Rep } from "@/lib/rep/types";

function fakeRep(params: {
  i: number;
  r: number;
  grade: DecisionGrade;
  adhered: boolean;
  committedAt?: number;
  guided?: boolean;
}): Rep {
  return {
    id: `r-${params.i}`,
    scenarioId: "s",
    seed: params.i,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: 0,
    committedAt: params.committedAt ?? params.i,
    plan: {
      setupChoice: "pullback",
      entryPrice: 100,
      stopPrice: 90,
      targetPrice: 120,
      targetR: 2,
    },
    adhered: params.adhered,
    exitReason: "target",
    decisionGrade: params.grade,
    result: { exitPrice: 100 + params.r * 10, rMultiple: params.r },
    guided: params.guided,
  };
}

describe("evaluateGate — G1", () => {
  it("모든 조건을 충족하면 passed=true", () => {
    const reps = Array.from({ length: GATE_TARGETS[1].count }, (_, i) =>
      fakeRep({ i, r: 1, grade: "A", adhered: true })
    );
    const evalResult = evaluateGate(1, reps);
    expect(evalResult.passed).toBe(true);
    expect(evalResult.requirements.every((r) => r.met)).toBe(true);
  });

  it("횟수가 부족하면 passed=false이고 count 요건만 미달", () => {
    const reps = Array.from({ length: 100 }, (_, i) =>
      fakeRep({ i, r: 1, grade: "A", adhered: true })
    );
    const evalResult = evaluateGate(1, reps);
    expect(evalResult.passed).toBe(false);
    const count = evalResult.requirements.find((r) => r.id === "count")!;
    expect(count.met).toBe(false);
    expect(count.current).toBe(100);
  });

  it("가이드 연습은 카운트에서 제외된다", () => {
    const reps = [
      ...Array.from({ length: 5 }, (_, i) => fakeRep({ i, r: 1, grade: "A", adhered: true, guided: true })),
      ...Array.from({ length: 10 }, (_, i) => fakeRep({ i: i + 100, r: 1, grade: "A", adhered: true })),
    ];
    const evalResult = evaluateGate(1, reps);
    const count = evalResult.requirements.find((r) => r.id === "count")!;
    expect(count.current).toBe(10);
  });
});

describe("evaluateGate — G2", () => {
  it("n < n* 이면 sample 요건이 미달로 표시된다", () => {
    // 편차가 커서 n*가 매우 크게 나오도록 구성
    const reps = [
      fakeRep({ i: 0, r: 5, grade: "A", adhered: true }),
      fakeRep({ i: 1, r: -3, grade: "A", adhered: true }),
      fakeRep({ i: 2, r: 5, grade: "A", adhered: true }),
    ];
    const evalResult = evaluateGate(2, reps);
    const sample = evalResult.requirements.find((r) => r.id === "sample")!;
    expect(sample.met).toBe(false);
  });
});

describe("evaluateGate — G3", () => {
  it("실계좌 연동 전에는 항상 passed=false", () => {
    const reps = Array.from({ length: 1000 }, (_, i) =>
      fakeRep({ i, r: 1, grade: "A", adhered: true })
    );
    expect(evaluateGate(3, reps).passed).toBe(false);
  });
});

describe("checkDemotion", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("표본이 50 미만이면 강등하지 않는다", () => {
    const reps = Array.from({ length: 10 }, (_, i) =>
      fakeRep({ i, r: -1, grade: "D", adhered: false })
    );
    expect(checkDemotion(reps)).toBe(false);
  });

  it("최근 50회 준수율이 낮아도 2주가 안 지났으면 강등하지 않는다", () => {
    const now = 100 * DAY;
    const reps = Array.from({ length: 50 }, (_, i) =>
      fakeRep({ i, r: -1, grade: "D", adhered: false, committedAt: now - (49 - i) * 1000 })
    );
    expect(checkDemotion(reps, now)).toBe(false);
  });

  it("최근 50회 준수율이 낮고 그 구간이 2주 이상 지속되면 강등한다", () => {
    const now = 100 * DAY;
    const reps = Array.from({ length: 50 }, (_, i) =>
      fakeRep({
        i,
        r: -1,
        grade: "D",
        adhered: false,
        committedAt: now - 15 * DAY + i * 1000,
      })
    );
    expect(checkDemotion(reps, now)).toBe(true);
  });

  it("준수율이 기준 이상이면 강등하지 않는다", () => {
    const now = 100 * DAY;
    const reps = Array.from({ length: 50 }, (_, i) =>
      fakeRep({
        i,
        r: 1,
        grade: "A",
        adhered: true,
        committedAt: now - 15 * DAY + i * 1000,
      })
    );
    expect(checkDemotion(reps, now)).toBe(false);
  });
});
