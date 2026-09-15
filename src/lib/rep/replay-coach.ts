import { rMultiple } from "@/lib/metrics/r-multiple";
import type { Plan } from "./types";

export type ReplayStatus = {
  /** 지금 가격 기준 R (원래 계획의 1R 기준) */
  currentR: number;
  /** 목표까지 남은 R (0 이상) */
  toTargetR: number;
  /** 지금 감시 중인 손절선까지 남은 R (0 이상). 손절을 내렸다면 내린 선 기준 */
  toStopR: number;
  /** 손절선(0) ~ 목표선(1) 사이에서 지금 가격의 위치 */
  position: number;
  tone: "danger" | "profit" | "neutral";
  /** 이 순간 계획을 흔드는 유혹을 짚는 한 줄. 특별히 없으면 null */
  message: string | null;
};

const NEAR_STOP_R = 0.3;
const NEAR_TARGET_R = 0.3;
const GIVEBACK_R = 0.5;

/**
 * 재생 중 "지금 어디쯤인가"와 "지금 흔들리기 쉬운 순간인가"를 계산한다.
 * 이미 공개된 봉(현재가·지금까지의 최고 종가)과 사용자의 계획만 쓴다 —
 * 앞으로 나올 봉은 전혀 보지 않으므로 결과를 미리 알려주지 않는다.
 */
export function replayStatus(params: {
  plan: Plan;
  /** 손절가를 내렸다면 그 값 */
  movedStopPrice?: number;
  currentPrice: number;
  /** 진입 후 지금까지 공개된 봉의 최고 종가 */
  peakPrice: number;
}): ReplayStatus {
  const { plan, movedStopPrice, currentPrice, peakPrice } = params;
  const stop = movedStopPrice ?? plan.stopPrice;
  const currentR = rMultiple(plan.entryPrice, currentPrice, plan.stopPrice);
  const stopR = rMultiple(plan.entryPrice, stop, plan.stopPrice);
  const peakR = rMultiple(plan.entryPrice, peakPrice, plan.stopPrice);
  const toTargetR = Math.max(0, plan.targetR - currentR);
  const toStopR = Math.max(0, currentR - stopR);
  const span = plan.targetR - stopR;
  const position = span > 0 ? Math.min(1, Math.max(0, (currentR - stopR) / span)) : 0;

  const tone = toStopR <= NEAR_STOP_R ? "danger" : currentR > 0 ? "profit" : "neutral";

  let message: string | null = null;
  // 손절을 이미 내렸다면 화면에 별도 경고가 있고, 이후 어떻게 끝나도 D다 — 여기서 덧붙이지 않는다
  if (movedStopPrice === undefined) {
    if (toStopR <= NEAR_STOP_R) {
      message = "손절선 바로 위입니다. 계획대로면 여기서 손절됩니다 — 손절가를 그대로 두세요.";
    } else if (toTargetR <= NEAR_TARGET_R) {
      message = "목표가 코앞입니다. 끝까지 계획을 믿어보세요.";
    } else if (peakR >= 1 && peakR - currentR >= GIVEBACK_R) {
      message = "벌었던 만큼이 줄고 있습니다. 지금 팔면 계획보다 먼저 판 것(C)으로 기록됩니다.";
    } else if (currentR >= 1) {
      message = "수익 중입니다. 이 구간은 팔고 싶어지는 게 정상입니다 — 목표까지 기다리는 연습입니다.";
    }
  }

  return { currentR, toTargetR, toStopR, position, tone, message };
}
