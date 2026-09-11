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
        reason:
          "표본이 적으면 잘한 건지 운인지 구별이 안 됩니다. 300회는 한 가지 셋업의 실행력을 운과 구별해서 볼 수 있는 최소 단위입니다.",
      },
      {
        id: "adherence",
        label: "계획 지킴",
        current: pct1(adherence),
        target: pct1(t.adherence),
        unit: "%",
        met: adherence >= t.adherence,
        reason:
          "이 서비스의 1번 성적표는 수익이 아니라 계획을 지켰는지입니다. 실행이 안정되지 않으면 다음 단계(판별)로 넘어가도 의미가 없습니다.",
      },
      {
        id: "abGrade",
        label: "A·B 등급",
        current: pct1(abRate),
        target: pct1(t.abGrade),
        unit: "%",
        met: abRate >= t.abGrade,
        reason: "채점 대부분이 A·B(계획 준수)여야, 지금의 좋은 결과가 우연이 아니라고 볼 수 있습니다.",
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
        reason: "여러 셋업을 섞어서 판별하려면 1단계보다 더 많은 표본이 필요합니다.",
      },
      {
        id: "setupAccuracy",
        label: "셋업 판별",
        current: pct1(accuracy),
        target: pct1(t.setupAccuracy),
        unit: "%",
        met: accuracy >= t.setupAccuracy,
        reason: "여러 셋업을 섞어 쓰려면 먼저 차트를 보고 모양을 정확히 구분할 수 있어야 합니다.",
      },
      {
        id: "expectancy",
        label: "평균 R",
        current: Math.round(exp * 100) / 100,
        target: t.expectancy,
        unit: "R",
        met: exp >= t.expectancy,
        reason: "실행력만으로는 부족합니다 — 실제로 돈을 버는 방향(+R)인지도 확인합니다.",
      },
      {
        id: "sample",
        label: "표본 충분성 (n ≥ n*)",
        current: n,
        target: Number.isFinite(nStar) ? Math.ceil(nStar) : n,
        unit: "회",
        met: sampleMet,
        reason:
          "지금까지의 승률·평균 R의 변동성을 근거로 계산한, 우연이 아니라고 믿을 수 있는 최소 횟수입니다. 성적이 들쭉날쭉할수록 이 숫자는 커집니다.",
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
      reason: "실계좌로 넘어가기 전 마지막 확인 구간입니다. 실제 돈 연동은 아직 지원하지 않아 안내만 제공합니다.",
    },
  ];
  return { level, requirements, passed: false };
}

export type GateTransition = { kind: "promotion" | "demotion"; from: GateLevel; to: GateLevel };

/** rep 1회가 끝난 직후의 승급·강등 결정. 승급 조건을 먼저 보고, 아니면 강등을 본다. */
export function decideGateTransition(
  level: GateLevel,
  reps: Rep[],
  now: number = Date.now()
): GateTransition | null {
  if (level < 3 && evaluateGate(level, reps).passed) {
    return { kind: "promotion", from: level, to: (level + 1) as GateLevel };
  }
  if (level > 1 && checkDemotion(reps, now)) {
    return { kind: "demotion", from: level, to: (level - 1) as GateLevel };
  }
  return null;
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
