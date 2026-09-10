import { describe, expect, it } from "vitest";
import {
  adherenceRate,
  expectancy,
  gradeDistribution,
  luckyBadTrades,
  requiredSample,
  setupAccuracy,
  sigmaR,
} from "./stats";
import type { DecisionGrade, ExitReason, Rep, SetupChoice } from "@/lib/rep/types";
import type { SetupLabel } from "@/lib/market/scenario";

function fakeRep(params: {
  r: number;
  grade: DecisionGrade;
  adhered: boolean;
  setupChoice?: SetupChoice;
  setupLabel?: SetupLabel;
  exitReason?: ExitReason;
}): Rep {
  return {
    id: `r-${Math.random()}`,
    scenarioId: "s",
    seed: 1,
    setupLabel: params.setupLabel ?? "pullback",
    state: "REVEALED",
    openedAt: 0,
    plan: {
      setupChoice: params.setupChoice ?? "pullback",
      entryPrice: 100,
      stopPrice: 90,
      targetPrice: 120,
      targetR: 2,
    },
    adhered: params.adhered,
    exitReason: params.exitReason ?? "target",
    decisionGrade: params.grade,
    result: { exitPrice: 100 + params.r * 10, rMultiple: params.r },
  };
}

describe("expectancy", () => {
  it("R의 평균을 계산한다", () => {
    const reps = [
      fakeRep({ r: 2, grade: "A", adhered: true }),
      fakeRep({ r: -1, grade: "A", adhered: true }),
    ];
    expect(expectancy(reps)).toBeCloseTo(0.5);
  });

  it("표본이 없으면 0을 반환한다", () => {
    expect(expectancy([])).toBe(0);
  });

  it("지나간(pass) 기록은 제외한다", () => {
    const reps = [
      fakeRep({ r: 2, grade: "A", adhered: true }),
      fakeRep({ r: 0, grade: "A", adhered: true, exitReason: "pass" }),
    ];
    expect(expectancy(reps)).toBeCloseTo(2);
  });
});

describe("sigmaR", () => {
  it("표본이 2개 미만이면 0을 반환한다", () => {
    expect(sigmaR([fakeRep({ r: 1, grade: "A", adhered: true })])).toBe(0);
  });

  it("표준편차를 계산한다", () => {
    const reps = [-1, 2, -1, 2].map((r) => fakeRep({ r, grade: "A", adhered: true }));
    expect(sigmaR(reps)).toBeCloseTo(Math.sqrt(3), 5);
  });
});

describe("requiredSample", () => {
  it("표본이 3개 미만이면 Infinity", () => {
    const reps = [1, 1].map((r) => fakeRep({ r, grade: "A", adhered: true }));
    expect(requiredSample(reps)).toBe(Infinity);
  });

  it("기대값이 0 이하이면 Infinity", () => {
    const reps = [1, -2, 1].map((r) => fakeRep({ r, grade: "A", adhered: true }));
    expect(requiredSample(reps)).toBe(Infinity);
  });

  it("분산이 0이면 (이미 확실하므로) 0을 반환한다", () => {
    const reps = [1, 1, 1].map((r) => fakeRep({ r, grade: "A", adhered: true }));
    expect(requiredSample(reps)).toBe(0);
  });

  it("n* = (2σ/E)² 공식대로 계산한다", () => {
    const reps = [-1, 2, -1, 2].map((r) => fakeRep({ r, grade: "A", adhered: true }));
    const expected = ((2 * Math.sqrt(3)) / 0.5) ** 2;
    expect(requiredSample(reps)).toBeCloseTo(expected, 5);
  });
});

describe("adherenceRate", () => {
  it("계획대로 실행한 비율을 계산한다", () => {
    const reps = [
      fakeRep({ r: 1, grade: "A", adhered: true }),
      fakeRep({ r: 1, grade: "A", adhered: true }),
      fakeRep({ r: -1, grade: "D", adhered: false }),
    ];
    expect(adherenceRate(reps)).toBeCloseTo(2 / 3);
  });
});

describe("setupAccuracy", () => {
  it("사용자의 선택과 실제 셋업이 같을 때만 정답으로 센다", () => {
    const reps = [
      fakeRep({ r: 1, grade: "A", adhered: true, setupChoice: "pullback", setupLabel: "pullback" }),
      fakeRep({ r: 1, grade: "A", adhered: true, setupChoice: "breakout", setupLabel: "pullback" }),
      fakeRep({ r: 1, grade: "A", adhered: true, setupChoice: "other", setupLabel: "none" }),
    ];
    expect(setupAccuracy(reps)).toBeCloseTo(2 / 3);
  });
});

describe("gradeDistribution", () => {
  it("등급별 개수를 센다", () => {
    const reps = [
      fakeRep({ r: 1, grade: "A", adhered: true }),
      fakeRep({ r: 1, grade: "A", adhered: true }),
      fakeRep({ r: -1, grade: "D", adhered: false }),
    ];
    expect(gradeDistribution(reps)).toEqual({ A: 2, B: 0, C: 0, D: 1 });
  });
});

describe("luckyBadTrades", () => {
  it("C·D 등급인데 이익이 난 비율을 계산한다", () => {
    const reps = [
      fakeRep({ r: 2, grade: "D", adhered: false }), // 운 좋은 나쁜 거래
      fakeRep({ r: -1, grade: "D", adhered: false }),
      fakeRep({ r: 1, grade: "A", adhered: true }),
    ];
    expect(luckyBadTrades(reps)).toBeCloseTo(1 / 3);
  });
});
