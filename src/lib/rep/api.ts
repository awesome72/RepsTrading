import { generateScenario } from "@/lib/market/scenario";
import type { DecisionGrade, ExitReason, Rep, SetupChoice } from "./types";

export type ServerRep = {
  id: string;
  user_id: string;
  setup_id: string;
  scenario_seed: number;
  state: "COMMITTED" | "EXECUTED" | "GRADED" | "REVEALED";
  committed_at: string;
  commit_hash: string;
  plan_setup: SetupChoice;
  plan_stop: number;
  plan_target_r: number;
  exit_price?: number;
  exit_reason?: ExitReason;
  exit_index?: number;
  adhered?: boolean;
  decision_grade?: DecisionGrade;
  r_result?: number;
  input_seconds?: number;
  created_at: string;
};

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `요청이 실패했습니다 (${res.status})`);
  }
  return body as T;
}

export async function apiCommitRep(params: {
  scenarioSeed: number;
  planSetup: SetupChoice;
  planStop: number;
  planTargetR: number;
  inputSeconds: number;
}): Promise<{ id: string; state: string; committed_at: string }> {
  const res = await fetch("/api/reps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenario_seed: params.scenarioSeed,
      plan_setup: params.planSetup,
      plan_stop: params.planStop,
      plan_target_r: params.planTargetR,
      input_seconds: params.inputSeconds,
    }),
  });
  return asJson(res);
}

export async function apiExecuteRep(
  id: string,
  params: { exitPrice: number; exitReason: ExitReason; exitIndex: number; adhered: boolean }
): Promise<{ state: string }> {
  const res = await fetch(`/api/reps/${id}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exit_price: params.exitPrice,
      exit_reason: params.exitReason,
      exit_index: params.exitIndex,
      adhered: params.adhered,
    }),
  });
  return asJson(res);
}

export async function apiGradeRep(
  id: string,
  decisionGrade: DecisionGrade
): Promise<{ state: string; decision_grade: DecisionGrade; r_result: number }> {
  const res = await fetch(`/api/reps/${id}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision_grade: decisionGrade }),
  });
  return asJson(res);
}

export async function apiRevealRep(id: string): Promise<ServerRep> {
  const res = await fetch(`/api/reps/${id}/reveal`, { method: "POST" });
  return asJson(res);
}

export async function apiPassRep(params: {
  scenarioSeed: number;
  inputSeconds: number;
}): Promise<ServerRep> {
  const res = await fetch("/api/reps/pass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_seed: params.scenarioSeed, input_seconds: params.inputSeconds }),
  });
  return asJson(res);
}

export async function apiListReps(): Promise<ServerRep[]> {
  const res = await fetch("/api/reps");
  return asJson(res);
}

export async function apiMigrate(reps: Rep[]): Promise<{ migrated: number; skipped: number }> {
  const res = await fetch("/api/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reps }),
  });
  return asJson(res);
}

/**
 * 서버 행을 lib/metrics·lib/gate가 기대하는 로컬 Rep 모양으로 바꾼다.
 * setupLabel(정답)은 저장하지 않으므로 scenario_seed로 다시 만들어낸다.
 */
export function serverRepToRep(sr: ServerRep): Rep {
  const scenario = generateScenario(sr.scenario_seed);
  const entryPrice = scenario.candles[scenario.decisionIndex - 1].close;

  return {
    id: sr.id,
    scenarioId: String(sr.scenario_seed),
    seed: sr.scenario_seed,
    setupLabel: scenario.setupLabel,
    state: sr.state,
    openedAt: new Date(sr.committed_at).getTime(),
    committedAt: new Date(sr.committed_at).getTime(),
    inputSeconds: sr.input_seconds,
    plan: {
      setupChoice: sr.plan_setup,
      entryPrice,
      stopPrice: sr.plan_stop,
      targetPrice: entryPrice + sr.plan_target_r * (entryPrice - sr.plan_stop),
      targetR: sr.plan_target_r,
    },
    adhered: sr.adhered,
    exitReason: sr.exit_reason,
    exitIndex: sr.exit_index,
    exitPrice: sr.exit_price,
    decisionGrade: sr.decision_grade,
    result:
      sr.r_result !== undefined
        ? { exitPrice: sr.exit_price ?? entryPrice, rMultiple: sr.r_result }
        : undefined,
  };
}
