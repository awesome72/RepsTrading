import {
  adherenceRate,
  expectancy,
  gradeDistribution,
  requiredSample,
  setupAccuracy,
  tradedReps,
} from "@/lib/metrics/stats";
import type { Rep } from "@/lib/rep/types";
import type { GateEvaluation, GateLevel, GateRequirement } from "./types";

/** G1 실행 / G2 판별 / G3 전환 (MASTER 고정값, 변경 금지) */
export const GATE_TARGETS = {
  1: { count: 300, adherence: 0.95, abGrade: 0.8 },
  2: { count: 600, setupAccuracy: 0.7, expectancy: 0.2 },
  3: { extraCount: 100 }, // G2 이후 추가 횟수 — 실계좌 연동 전까지는 안내만
} as const;

const DEMOTION_WINDOW = 50;
const DEMOTION_THRESHOLD = 0.85;
const DEMOTION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

function pct1(x: number): number {
  return Math.round(x * 1000) / 10;
}

export function evaluateGate(level: GateLevel, reps: Rep[]): GateEvaluation {
  const traded = tradedReps(reps);
  const n = traded.length;

  if (level === 1) {
    const t = GATE_TARGETS[1];
    const adherence = adherenceRate(reps);
    const dist = gradeDistribution(reps);
    const abRate = n > 0 ? (dist.A + dist.B) / n : 0;

    const requirements: GateRequirement[] = [
      {
        id: "count",
        label: "누적 횟수",
        current: n,
        target: t.count,
        unit: "회",
        met: n >= t.count,
      },
      {
        id: "adherence",
        label: "계획 지킴",
        current: pct1(adherence),
        target: pct1(t.adherence),
        unit: "%",
        met: adherence >= t.adherence,
      },
      {
        id: "abGrade",
        label: "A·B 등급",
        current: pct1(abRate),
        target: pct1(t.abGrade),
        unit: "%",
        met: abRate >= t.abGrade,
      },
    ];
    return { level, requirements, passed: requirements.every((r) => r.met) };
  }

  if (level === 2) {
    const t = GATE_TARGETS[2];
    const accuracy = setupAccuracy(reps);
    const exp = expectancy(reps);
    const nStar = requiredSample(reps);
    const sampleMet = Number.isFinite(nStar) && n >= nStar;

    const requirements: GateRequirement[] = [
      {
        id: "count",
        label: "누적 횟수",
        current: n,
        target: t.count,
        unit: "회",
        met: n >= t.count,
      },
      {
        id: "setupAccuracy",
        label: "셋업 판별",
        current: pct1(accuracy),
        target: pct1(t.setupAccuracy),
        unit: "%",
        met: accuracy >= t.setupAccuracy,
      },
      {
        id: "expectancy",
        label: "평균 R",
        current: Math.round(exp * 100) / 100,
        target: t.expectancy,
        unit: "R",
        met: exp >= t.expectancy,
      },
      {
        id: "sample",
        label: "표본 충분성 (n ≥ n*)",
        current: n,
        target: Number.isFinite(nStar) ? Math.ceil(nStar) : n,
        unit: "회",
        met: sampleMet,
      },
    ];
    return { level, requirements, passed: requirements.every((r) => r.met) };
  }

  // G3: 실계좌 연동이 필요해 지금은 횟수만 안내하고 통과 처리는 하지 않는다
  const target = GATE_TARGETS[2].count + GATE_TARGETS[3].extraCount;
  const requirements: GateRequirement[] = [
    {
      id: "count",
      label: "추가 누적 횟수",
      current: n,
      target,
      unit: "회",
      met: n >= target,
    },
  ];
  return { level, requirements, passed: false };
}

/**
 * 강등 판정: 최근 50회 준수율이 85% 미만인 상태가 2주 이상 이어졌는가.
 * "최근 50회의 가장 오래된 기록"이 14일 이상 전이면서 그 구간의 준수율이 기준 미달이면 강등한다.
 */
export function checkDemotion(reps: Rep[], now: number = Date.now()): boolean {
  const traded = [...tradedReps(reps)].sort(
    (a, b) => (a.committedAt ?? a.openedAt) - (b.committedAt ?? b.openedAt)
  );
  if (traded.length < DEMOTION_WINDOW) return false;

  const recent = traded.slice(-DEMOTION_WINDOW);
  const rate = recent.filter((r) => r.adhered).length / recent.length;
  if (rate >= DEMOTION_THRESHOLD) return false;

  const oldest = recent[0];
  const oldestTime = oldest.committedAt ?? oldest.openedAt;
  return now - oldestTime >= DEMOTION_DURATION_MS;
}
