import { createHash } from "crypto";
import { generateScenario, type Scenario } from "@/lib/market/scenario";
import type { ExitReason, Plan, SetupChoice } from "@/lib/rep/types";

/** 계획 저장 시점의 필드를 해시로 남긴다 (무결성 확인용, 변조 감지) */
export function computeCommitHash(params: {
  userId: string;
  scenarioSeed: number;
  planSetup: string;
  planStop: number;
  planTargetR: number;
  committedAt: string;
}): string {
  const raw = [
    params.userId,
    params.scenarioSeed,
    params.planSetup,
    params.planStop,
    params.planTargetR,
    params.committedAt,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

/** scenario_seed로부터 진입가를 결정적으로 재생성한다 — 클라이언트를 신뢰하지 않는다 */
export function deriveEntryPrice(scenarioSeed: number): number {
  const scenario = generateScenario(scenarioSeed);
  return scenario.candles[scenario.decisionIndex - 1].close;
}

/** DB 행으로부터 시나리오와 계획을 다시 만든다 — 진입가·목표가는 저장하지 않고 seed로 재생성한다 */
export function rebuildPlan(row: {
  scenario_seed: number;
  plan_setup: SetupChoice;
  plan_stop: number;
  plan_target_r: number;
}): { scenario: Scenario; plan: Plan } {
  const scenario = generateScenario(row.scenario_seed);
  const entryPrice = scenario.candles[scenario.decisionIndex - 1].close;
  return {
    scenario,
    plan: {
      setupChoice: row.plan_setup,
      entryPrice,
      stopPrice: row.plan_stop,
      targetPrice: entryPrice + row.plan_target_r * (entryPrice - row.plan_stop),
      targetR: row.plan_target_r,
    },
  };
}

const PRICE_TOLERANCE = 0.5; // 부동소수점 오차 허용

/**
 * 클라이언트가 보낸 청산 정보가 scenario_seed로 재생성한 캔들과 실제로 맞는지 검증한다.
 * 서버가 손익을 직접 계산하므로, 클라이언트가 유리한 청산가를 조작해 보낼 수 없다.
 */
export function validateExit(params: {
  scenarioSeed: number;
  planStop: number;
  planTargetR: number;
  exitReason: ExitReason;
  exitPrice: number;
  exitIndex: number;
  /** 재생 중 손절가를 내렸다면 원래 손절가보다 낮은 가격의 손절 청산을 허용한다 */
  stopMoved?: boolean;
}): { valid: boolean; reason?: string } {
  const scenario = generateScenario(params.scenarioSeed);
  const { decisionIndex, candles } = scenario;
  const entryPrice = candles[decisionIndex - 1].close;
  const targetPrice = entryPrice + params.planTargetR * (entryPrice - params.planStop);

  // "지나간다"는 포지션을 잡지 않은 것이므로 진입가 자체를 청산가로 본다.
  if (params.exitReason === "pass") {
    return Math.abs(params.exitPrice - entryPrice) <= PRICE_TOLERANCE
      ? { valid: true }
      : { valid: false, reason: "지나간 경우 청산가는 현재가와 같아야 합니다." };
  }

  if (params.exitIndex < decisionIndex - 1 || params.exitIndex >= candles.length) {
    return { valid: false, reason: "exit_index가 시나리오 범위를 벗어났습니다." };
  }

  const candle = candles[params.exitIndex];

  switch (params.exitReason) {
    case "stop":
      if (params.stopMoved && params.exitPrice < params.planStop) {
        return candle.low <= params.exitPrice + PRICE_TOLERANCE
          ? { valid: true }
          : { valid: false, reason: "해당 봉이 옮긴 손절가에 닿지 않았습니다." };
      }
      if (candle.low > params.planStop) {
        return { valid: false, reason: "해당 봉이 손절가에 닿지 않았습니다." };
      }
      if (Math.abs(params.exitPrice - params.planStop) > PRICE_TOLERANCE) {
        return { valid: false, reason: "청산가가 손절가와 일치하지 않습니다." };
      }
      return { valid: true };
    case "target":
      if (candle.high < targetPrice) {
        return { valid: false, reason: "해당 봉이 목표가에 닿지 않았습니다." };
      }
      if (Math.abs(params.exitPrice - targetPrice) > PRICE_TOLERANCE) {
        return { valid: false, reason: "청산가가 목표가와 일치하지 않습니다." };
      }
      return { valid: true };
    case "manual":
    case "timeout":
      if (Math.abs(params.exitPrice - candle.close) > PRICE_TOLERANCE) {
        return { valid: false, reason: "청산가가 해당 봉의 종가와 일치하지 않습니다." };
      }
      return { valid: true };
    default:
      return { valid: false, reason: "알 수 없는 청산 사유입니다." };
  }
}
