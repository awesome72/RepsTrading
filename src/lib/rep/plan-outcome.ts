import type { Candle } from "@/lib/market/generator";
import type { Scenario } from "@/lib/market/scenario";
import { rMultiple } from "@/lib/metrics/r-multiple";
import type { Plan } from "./types";

/** 계획 저장 후 최대 몇 봉까지 재생하는가 — 넘으면 시간 초과로 청산한다 */
export const MAX_REPLAY_CANDLES = 30;
/** 결과 공개 화면에서 청산 이후 몇 봉을 더 보여주는가 */
export const POST_EXIT_CANDLES = 20;
/** 결과 공개 화면에서 판단 시점 이전 몇 봉을 함께 보여주는가 */
const PRE_DECISION_CANDLES = 20;

export type PlanExit = { exitReason: "stop" | "target"; exitPrice: number };

/** 봉 하나가 손절·목표에 닿았는지. 한 봉에서 둘 다 닿으면 손절로 본다(보수적으로). */
export function checkPlanExit(candle: Candle, plan: Pick<Plan, "stopPrice" | "targetPrice">): PlanExit | null {
  if (candle.low <= plan.stopPrice) return { exitReason: "stop", exitPrice: plan.stopPrice };
  if (candle.high >= plan.targetPrice) return { exitReason: "target", exitPrice: plan.targetPrice };
  return null;
}

export type SimulatedOutcome = {
  exitReason: "stop" | "target" | "timeout";
  exitIndex: number;
  exitPrice: number;
  rMultiple: number;
};

/** 계획을 끝까지 그대로 따랐다면 어떻게 끝났을지 — 재생 화면과 같은 규칙으로 계산한다 */
export function simulatePlan(scenario: Scenario, plan: Plan): SimulatedOutcome {
  const { candles, decisionIndex } = scenario;
  const finish = (exitReason: SimulatedOutcome["exitReason"], exitIndex: number, exitPrice: number) => ({
    exitReason,
    exitIndex,
    exitPrice,
    rMultiple: rMultiple(plan.entryPrice, exitPrice, plan.stopPrice),
  });

  for (let k = 0; k < MAX_REPLAY_CANDLES; k++) {
    const idx = decisionIndex + k;
    if (idx >= candles.length) return finish("timeout", idx - 1, candles[idx - 1].close);
    const hit = checkPlanExit(candles[idx], plan);
    if (hit) return finish(hit.exitReason, idx, hit.exitPrice);
  }
  const last = decisionIndex + MAX_REPLAY_CANDLES - 1;
  return finish("timeout", last, candles[last].close);
}

/**
 * 결과 공개 화면에 보여줄 봉 범위: 판단 20봉 전부터 청산 후 20봉까지.
 * lastIndex에 "계획대로라면 끝났을 봉"을 넘기면 그 봉 이후 20봉까지로 늘린다.
 */
export function revealWindow(scenario: Scenario, lastIndex: number): Candle[] {
  const start = Math.max(0, scenario.decisionIndex - PRE_DECISION_CANDLES);
  const end = Math.min(scenario.candles.length, lastIndex + 1 + POST_EXIT_CANDLES);
  return scenario.candles.slice(start, end);
}
