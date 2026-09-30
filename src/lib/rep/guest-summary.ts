import { adherenceRate, decisionReps, expectancy, setupAccuracy, tradedReps } from "@/lib/metrics/stats";
import type { Rep } from "./types";

export type GuestSummary = {
  /** 결과가 확정된 판단 수 (산 것 + 지나간 것) */
  decisions: number;
  /** 실제로 산 판단 수 */
  traded: number;
  /** 산 판단이 없으면 null — "0%"로 보이면 계획을 어긴 것처럼 읽힌다 */
  adherence: number | null;
  expectancy: number | null;
  /** 판단이 하나도 없으면 null */
  accuracy: number | null;
};

/**
 * 게스트 한도(5회)에 닿았을 때 보여줄 지금까지의 숫자. 진척 화면·통계 바와 같은 lib/metrics 함수를 쓴다.
 * 로그인하면 이 기록이 그대로 계정으로 옮겨진다는 걸 구체적인 숫자로 보여주는 용도다.
 */
export function guestSummary(reps: Rep[]): GuestSummary {
  const decisions = decisionReps(reps).length;
  const traded = tradedReps(reps).length;
  return {
    decisions,
    traded,
    adherence: traded > 0 ? adherenceRate(reps) : null,
    expectancy: traded > 0 ? expectancy(reps) : null,
    accuracy: decisions > 0 ? setupAccuracy(reps) : null,
  };
}
