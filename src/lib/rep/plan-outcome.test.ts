import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/generator";
import type { Scenario } from "@/lib/market/scenario";
import {
  checkPlanExit,
  isGradeAllowed,
  judgeExecution,
  MAX_REPLAY_CANDLES,
  POST_EXIT_CANDLES,
  revealWindow,
  simulatePlan,
} from "./plan-outcome";
import type { Plan } from "./types";

const DECISION = 10;

function candle(i: number, low: number, high: number, close = (low + high) / 2): Candle {
  return { time: i, open: close, high, low, close, volume: 1 };
}

/** 판단 시점 이후 봉을 원하는 대로 넣을 수 있는 가짜 시나리오. 기본값은 100 부근 횡보 */
function scenario(future: Candle[] = [], total = 60): Scenario {
  const candles = Array.from({ length: total }, (_, i) => candle(i, 99, 101, 100));
  future.forEach((c, k) => (candles[DECISION + k] = { ...c, time: DECISION + k }));
  return { id: "t", seed: 1, candles, decisionIndex: DECISION, setupLabel: "pullback", regime: "uptrend" };
}

const plan: Plan = { setupChoice: "pullback", entryPrice: 100, stopPrice: 95, targetPrice: 110, targetR: 2 };

describe("checkPlanExit", () => {
  it("한 봉에서 손절과 목표를 모두 건드리면 손절로 본다", () => {
    expect(checkPlanExit(candle(0, 94, 111), plan)).toEqual({ exitReason: "stop", exitPrice: 95 });
  });
  it("아무것도 안 닿으면 null", () => {
    expect(checkPlanExit(candle(0, 96, 109), plan)).toBeNull();
  });
});

describe("simulatePlan", () => {
  it("목표가에 먼저 닿으면 +목표R", () => {
    const out = simulatePlan(scenario([candle(0, 99, 104), candle(0, 100, 111)]), plan);
    expect(out).toMatchObject({ exitReason: "target", exitIndex: DECISION + 1, rMultiple: 2 });
  });

  it("손절가에 먼저 닿으면 -1R", () => {
    const out = simulatePlan(scenario([candle(0, 94, 101)]), plan);
    expect(out).toMatchObject({ exitReason: "stop", exitIndex: DECISION, rMultiple: -1 });
  });

  it("30봉 안에 아무것도 안 닿으면 30번째 봉 종가로 시간 초과", () => {
    const out = simulatePlan(scenario(), plan);
    expect(out.exitReason).toBe("timeout");
    expect(out.exitIndex).toBe(DECISION + MAX_REPLAY_CANDLES - 1);
    expect(out.rMultiple).toBe(0);
  });

  it("봉이 모자라면 마지막 봉에서 시간 초과", () => {
    const out = simulatePlan(scenario([], DECISION + 5), plan);
    expect(out).toMatchObject({ exitReason: "timeout", exitIndex: DECISION + 4 });
  });
});

describe("judgeExecution", () => {
  const stopHitFirst = scenario([candle(0, 94, 101), candle(0, 89, 100)]);

  it("계획상 청산 지점에서 계획대로 끝나면 준수(최고 A)", () => {
    const v = judgeExecution(stopHitFirst, plan, {
      exitReason: "stop",
      exitIndex: DECISION,
      exitPrice: 95,
      stopMoved: false,
    });
    expect(v).toEqual({ kind: "followed", adhered: true, bestGrade: "A" });
  });

  it("계획상 청산 전에 직접 팔면 일찍 청산(최고 C)", () => {
    const v = judgeExecution(scenario(), plan, {
      exitReason: "manual",
      exitIndex: DECISION + 2,
      exitPrice: 100,
      stopMoved: false,
    });
    expect(v).toEqual({ kind: "early-exit", adhered: false, bestGrade: "C" });
  });

  it("손절가를 내려서 원래 손절 아래에서 팔리면, 플래그가 없어도 서버가 손절 무시(D)로 본다", () => {
    const v = judgeExecution(stopHitFirst, plan, {
      exitReason: "stop",
      exitIndex: DECISION + 1,
      exitPrice: 90,
      stopMoved: false,
    });
    expect(v.kind).toBe("stop-ignored");
    expect(v.bestGrade).toBe("D");
  });

  it("원래 손절을 지나서 들고 있다가 직접 팔아도 손절 무시(D)", () => {
    const v = judgeExecution(stopHitFirst, plan, {
      exitReason: "manual",
      exitIndex: DECISION + 1,
      exitPrice: 96,
      stopMoved: false,
    });
    expect(v.kind).toBe("stop-ignored");
  });

  it("손절을 내렸지만 결과에 영향이 없었어도, 스스로 보고하면 D", () => {
    const v = judgeExecution(scenario([candle(0, 100, 111)]), plan, {
      exitReason: "target",
      exitIndex: DECISION,
      exitPrice: 110,
      stopMoved: true,
    });
    expect(v.bestGrade).toBe("D");
  });
});

describe("isGradeAllowed", () => {
  it("실행 사실보다 좋은 등급은 거부하고, 같거나 나쁜 등급은 허용한다", () => {
    expect(isGradeAllowed("A", "C")).toBe(false);
    expect(isGradeAllowed("B", "C")).toBe(false);
    expect(isGradeAllowed("C", "C")).toBe(true);
    expect(isGradeAllowed("D", "C")).toBe(true);
    expect(isGradeAllowed("B", "A")).toBe(true);
  });
});

describe("revealWindow", () => {
  it("판단 20봉 전부터 청산 후 20봉까지", () => {
    const s = scenario([], 100);
    const w = revealWindow(s, DECISION + 5);
    expect(w[0].time).toBe(0);
    expect(w.at(-1)!.time).toBe(DECISION + 5 + POST_EXIT_CANDLES);
  });

  it("시나리오 끝을 넘지 않는다", () => {
    const s = scenario([], 40);
    expect(revealWindow(s, 38).at(-1)!.time).toBe(39);
  });
});
