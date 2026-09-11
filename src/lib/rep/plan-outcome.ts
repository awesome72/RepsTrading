import type { Candle } from "@/lib/market/generator";
import type { Scenario } from "@/lib/market/scenario";
import { rMultiple } from "@/lib/metrics/r-multiple";
import type { DecisionGrade, ExitReason, Plan } from "./types";

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

export type ExecutionFacts = {
  exitReason: ExitReason;
  exitIndex: number;
  exitPrice: number;
  /** 재생 중 "손절가 내리기"를 눌렀는가 (클라이언트만 아는 사실 — 스스로 불리하게만 보고할 수 있다) */
  stopMoved: boolean;
};

export type ExecutionKind = "followed" | "early-exit" | "stop-ignored";

export type ExecutionVerdict = {
  kind: ExecutionKind;
  adhered: boolean;
  /** 실행 사실이 허락하는 가장 좋은 등급. 이보다 좋은 등급은 줄 수 없다 */
  bestGrade: Extract<DecisionGrade, "A" | "C" | "D">;
};

const PRICE_TOLERANCE = 0.5;

/**
 * 계획을 지켰는지는 사용자가 아니라 실행 기록이 정한다.
 * - 계획상 청산 지점을 지나서도 들고 있었거나, 원래 손절가 아래에서 팔렸거나, 손실이 1R을 넘었다 → 손절 무시(D)
 * - 계획상 청산 전에 직접 팔았다 → 일찍 청산(C)
 * - 계획상 청산 지점에서 계획대로 끝났다 → 계획 준수(A·B는 판단 질문으로 가른다)
 */
export function judgeExecution(scenario: Scenario, plan: Plan, facts: ExecutionFacts): ExecutionVerdict {
  const planned = simulatePlan(scenario, plan);
  const r = rMultiple(plan.entryPrice, facts.exitPrice, plan.stopPrice);
  const stopIgnored =
    facts.stopMoved ||
    r < -1 - 1e-6 ||
    facts.exitIndex > planned.exitIndex ||
    (facts.exitReason === "stop" && facts.exitPrice < plan.stopPrice - PRICE_TOLERANCE);

  if (stopIgnored) return { kind: "stop-ignored", adhered: false, bestGrade: "D" };
  if (facts.exitReason === "manual") return { kind: "early-exit", adhered: false, bestGrade: "C" };
  return { kind: "followed", adhered: true, bestGrade: "A" };
}

const GRADE_ORDER: DecisionGrade[] = ["A", "B", "C", "D"];

/** 사용자는 실행 사실보다 스스로를 더 나쁘게 채점할 수는 있어도 더 좋게 채점할 수는 없다 */
export function isGradeAllowed(grade: DecisionGrade, bestGrade: DecisionGrade): boolean {
  return GRADE_ORDER.indexOf(grade) >= GRADE_ORDER.indexOf(bestGrade);
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
