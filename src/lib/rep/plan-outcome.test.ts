import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/generator";
import type { Scenario } from "@/lib/market/scenario";
import {
  checkPlanExit,
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
