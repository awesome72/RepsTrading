import { rMultiple } from "@/lib/metrics/r-multiple";
import { computeCommitHash, deriveEntryPrice, rebuildPlan, validateExit } from "./server-guard";
import { isGradeAllowed, judgeExecution } from "./plan-outcome";
import type { DecisionGrade, Rep, SetupChoice } from "./types";

const SETUPS: SetupChoice[] = ["pullback", "breakout", "other"];
const GRADES: DecisionGrade[] = ["A", "B", "C", "D"];

export type MigrationRow = {
  user_id: string;
  setup_id: SetupChoice;
  scenario_seed: number;
  state: "REVEALED";
  committed_at: string;
  commit_hash: string;
  plan_setup: SetupChoice;
  plan_stop: number;
  plan_target_r: number;
  exit_price: number;
  exit_reason: NonNullable<Rep["exitReason"]>;
  exit_index: number;
  adhered: boolean;
  decision_grade: DecisionGrade;
  r_result: number;
  input_seconds: number | null;
};

function isNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * 브라우저에만 있던 기록(게스트 연습·예전 로컬 기록)을 서버 행으로 바꾼다.
 * 클라이언트가 보낸 결과·준수 여부·등급은 믿지 않고, seed와 청산 기록으로 서버가 다시 계산한다.
 * 검증을 통과하지 못하면 null — 옮기지 않는다.
 */
export function toMigrationRow(rep: Rep, userId: string): MigrationRow | null {
  if (!rep || !isNum(rep.seed) || !isNum(rep.committedAt) || rep.guided) return null;
  if (rep.state !== "REVEALED" && rep.state !== "GRADED") return null;
  const committedAt = new Date(rep.committedAt).toISOString();
  const inputSeconds = isNum(rep.inputSeconds) ? rep.inputSeconds : null;

  const base = (planSetup: SetupChoice, planStop: number, planTargetR: number) => ({
    user_id: userId,
    setup_id: planSetup,
    scenario_seed: rep.seed,
    state: "REVEALED" as const,
    committed_at: committedAt,
    commit_hash: computeCommitHash({
      userId,
      scenarioSeed: rep.seed,
      planSetup,
      planStop,
      planTargetR,
      committedAt,
    }),
    plan_setup: planSetup,
    plan_stop: planStop,
    plan_target_r: planTargetR,
    input_seconds: inputSeconds,
  });

  if (rep.exitReason === "pass") {
    // /api/reps/pass와 같은 규칙: 기타 · 손절=진입가 · 0R
    const entryPrice = deriveEntryPrice(rep.seed);
    return {
      ...base("other", entryPrice, 0),
      exit_price: entryPrice,
      exit_reason: "pass",
      exit_index: 0,
      adhered: true,
      decision_grade: "A",
      r_result: 0,
    };
  }

  const p = rep.plan;
  if (!p || !SETUPS.includes(p.setupChoice) || !isNum(p.stopPrice) || !isNum(p.targetR)) return null;
  const exitPrice = rep.exitPrice ?? rep.result?.exitPrice;
  if (!rep.exitReason || !isNum(rep.exitIndex) || !isNum(exitPrice)) return null;

  const { scenario, plan } = rebuildPlan({
    scenario_seed: rep.seed,
    plan_setup: p.setupChoice,
    plan_stop: p.stopPrice,
    plan_target_r: p.targetR,
  });
  if (!(plan.stopPrice < plan.entryPrice)) return null;

  const stopMoved = rep.movedStopPrice !== undefined;
  const validation = validateExit({
    scenarioSeed: rep.seed,
    planStop: plan.stopPrice,
    planTargetR: plan.targetR,
    exitReason: rep.exitReason,
    exitPrice,
    exitIndex: rep.exitIndex,
    stopMoved,
  });
  if (!validation.valid) return null;

  const verdict = judgeExecution(scenario, plan, {
    exitReason: rep.exitReason,
    exitIndex: rep.exitIndex,
    exitPrice,
    stopMoved,
  });
  const claimed = rep.decisionGrade && GRADES.includes(rep.decisionGrade) ? rep.decisionGrade : null;
  // 실행 기록보다 좋게 매긴 등급은 기록이 허락하는 최고 등급으로 내린다
  const grade = claimed && isGradeAllowed(claimed, verdict.bestGrade) ? claimed : verdict.bestGrade;

  return {
    ...base(p.setupChoice, plan.stopPrice, plan.targetR),
    exit_price: exitPrice,
    exit_reason: rep.exitReason,
    exit_index: rep.exitIndex,
    adhered: verdict.adhered,
    decision_grade: grade,
    r_result: rMultiple(plan.entryPrice, exitPrice, plan.stopPrice),
  };
}
