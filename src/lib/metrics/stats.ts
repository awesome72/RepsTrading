import type { DecisionGrade, Rep, SetupChoice } from "@/lib/rep/types";
import type { SetupLabel } from "@/lib/market/scenario";

/** 지나간(pass) 기록과 온보딩 가이드 연습은 실제 성과가 아니므로 지표에서 제외한다 */
export function tradedReps(reps: Rep[]): Rep[] {
  return reps.filter((r) => r.exitReason !== "pass" && !r.guided && r.result);
}

/** 기대값 — R의 평균 */
export function expectancy(reps: Rep[]): number {
  const traded = tradedReps(reps);
  if (traded.length === 0) return 0;
  const sum = traded.reduce((acc, r) => acc + (r.result?.rMultiple ?? 0), 0);
  return sum / traded.length;
}

/** R의 표준편차 (표본표준편차, n-1) */
export function sigmaR(reps: Rep[]): number {
  const traded = tradedReps(reps);
  if (traded.length < 2) return 0;
  const mean = expectancy(reps);
  const variance =
    traded.reduce((acc, r) => acc + (r.result!.rMultiple - mean) ** 2, 0) /
    (traded.length - 1);
  return Math.sqrt(variance);
}

/**
 * 실력인지 운인지 구별하는 데 필요한 표본 수. n* = (2σ / E[R])²
 * 표본이 3개 미만이거나 기대값이 0 이하면 판단 불가(Infinity)로 처리한다.
 */
export function requiredSample(reps: Rep[]): number {
  const traded = tradedReps(reps);
  if (traded.length < 3) return Infinity;
  const mean = expectancy(reps);
  if (mean <= 0) return Infinity;
  const sigma = sigmaR(reps);
  return ((2 * sigma) / mean) ** 2;
}

/** 계획대로 실행한 비율 */
export function adherenceRate(reps: Rep[]): number {
  const traded = tradedReps(reps);
  if (traded.length === 0) return 0;
  return traded.filter((r) => r.adhered).length / traded.length;
}

const CHOICE_TO_LABEL: Record<SetupChoice, SetupLabel> = {
  pullback: "pullback",
  breakout: "breakout",
  other: "none",
};

/** 사용자가 고른 셋업이 실제 셋업과 일치한 비율 */
export function setupAccuracy(reps: Rep[]): number {
  const traded = tradedReps(reps);
  if (traded.length === 0) return 0;
  const correct = traded.filter(
    (r) => r.plan && CHOICE_TO_LABEL[r.plan.setupChoice] === r.setupLabel
  ).length;
  return correct / traded.length;
}

export type GradeDistribution = Record<DecisionGrade, number>;

/** 등급(A~D)별 개수 */
export function gradeDistribution(reps: Rep[]): GradeDistribution {
  const dist: GradeDistribution = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of tradedReps(reps)) {
    if (r.decisionGrade) dist[r.decisionGrade]++;
  }
  return dist;
}

/** 등급 C·D이면서 결과가 이익(R>0)이었던 비율 — "운이 좋았던" 거래 */
export function luckyBadTrades(reps: Rep[]): number {
  const traded = tradedReps(reps);
  if (traded.length === 0) return 0;
  const lucky = traded.filter(
    (r) =>
      (r.decisionGrade === "C" || r.decisionGrade === "D") &&
      (r.result?.rMultiple ?? 0) > 0
  ).length;
  return lucky / traded.length;
}
