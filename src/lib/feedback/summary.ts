import { adherenceRate, requiredSample, tradedReps } from "@/lib/metrics/stats";
import { getFeedback } from "./rules";
import type { Rep } from "@/lib/rep/types";

export type HistorySummary = {
  adherenceBefore: number;
  adherenceAfter: number;
  remainingBefore: number | null;
  remainingAfter: number | null;
  /** 이번 rep까지 포함한 누적 거래 수(지나간 것·가이드 제외) — 게이트 "누적 횟수"와 같은 기준 */
  tradedAfter: number;
  /** "다음 한 가지" 문구 — getFeedback(before + [current], ...) */
  message: string;
};

/**
 * 결과 화면의 "이번으로 달라진 것" + "다음 한 가지"에 필요한 값을 한 번에 계산한다.
 * 서버(채점·지나가기 API)와 클라이언트(게스트) 양쪽에서 그대로 불러 쓴다 — 계산은 한 곳에만 있다.
 */
export function computeHistorySummary(
  before: Rep[],
  current: Rep,
  dailyGoal: number | null,
  now: number = Date.now()
): HistorySummary {
  const after = [...before, current];
  const nStarBefore = requiredSample(before);
  const nStarAfter = requiredSample(after);
  return {
    adherenceBefore: adherenceRate(before),
    adherenceAfter: adherenceRate(after),
    remainingBefore: Number.isFinite(nStarBefore)
      ? Math.max(0, Math.ceil(nStarBefore - tradedReps(before).length))
      : null,
    remainingAfter: Number.isFinite(nStarAfter)
      ? Math.max(0, Math.ceil(nStarAfter - tradedReps(after).length))
      : null,
    tradedAfter: tradedReps(after).length,
    message: getFeedback(after, { now, dailyGoal }),
  };
}
