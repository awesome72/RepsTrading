import { generateScenario, type SetupLabel } from "@/lib/market/scenario";
import type { HistorySummary } from "@/lib/feedback/summary";
import type { GateEvaluation, GateLevel } from "@/lib/gate/types";
import type { PeriodStats } from "@/lib/metrics/progress";
import type { GradeDistribution } from "@/lib/metrics/stats";
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
  /** 커밋 시점에 캐시된 값 — 이 마이그레이션 이전 행은 없을 수 있다(그때는 seed로 재생성) */
  setup_label?: SetupLabel;
  entry_price?: number;
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
  params: { exitPrice: number; exitReason: ExitReason; exitIndex: number; stopMoved: boolean }
): Promise<{ state: string }> {
  const res = await fetch(`/api/reps/${id}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exit_price: params.exitPrice,
      exit_reason: params.exitReason,
      exit_index: params.exitIndex,
      stop_moved: params.stopMoved,
    }),
  });
  return asJson(res);
}

export async function apiGradeRep(
  id: string,
  decisionGrade: DecisionGrade
): Promise<{
  state: string;
  decision_grade: DecisionGrade;
  r_result: number;
  feedback?: HistorySummary;
}> {
  const res = await fetch(`/api/reps/${id}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision_grade: decisionGrade }),
  });
  return asJson(res);
}

export async function apiPassRep(params: {
  scenarioSeed: number;
  inputSeconds: number;
}): Promise<ServerRep & { feedback?: HistorySummary }> {
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

export type RepListFilter = {
  setup?: SetupChoice;
  grade?: DecisionGrade;
  /** 지나간 것·아직 채점 안 된 것을 서버에서 뺀다 */
  traded?: boolean;
};

/** /journal의 표: 커서 기반 페이지 단위로 받는다. filter는 서버에서 걸러 불필요한 행을 안 보낸다 */
export async function apiListRepsPage(
  filter: RepListFilter & { limit: number; before?: string }
): Promise<{ reps: ServerRep[]; hasMore: boolean }> {
  const params = new URLSearchParams({ limit: String(filter.limit) });
  if (filter.before) params.set("before", filter.before);
  if (filter.setup) params.set("setup", filter.setup);
  if (filter.grade) params.set("grade", filter.grade);
  if (filter.traded) params.set("traded", "1");
  const res = await fetch(`/api/reps?${params}`);
  return asJson(res);
}

/** CSV "전체 내보내기" — 지금 걸린 필터에 맞는 전체 기록을 한 번에 받는다 (사용자가 직접 누른 동작이라 무제한 요청이어도 된다) */
export async function apiListRepsAll(filter: RepListFilter = {}): Promise<ServerRep[]> {
  const params = new URLSearchParams();
  if (filter.setup) params.set("setup", filter.setup);
  if (filter.grade) params.set("grade", filter.grade);
  if (filter.traded) params.set("traded", "1");
  const qs = params.toString();
  const res = await fetch(`/api/reps${qs ? `?${qs}` : ""}`);
  return asJson(res);
}

export type ProgressSummary = {
  n: number;
  expectancy: number;
  adherence: number;
  accuracy: number;
  remaining: number | null;
  grades: GradeDistribution;
  lucky: number;
  curve: { i: number; cum: number }[];
  matrix: { goodGood: number; goodBad: number; badGood: number; badBad: number };
  gateLevel: GateLevel;
  gateEvaluation: GateEvaluation;
  pace: { perDay: number; daysLeft: number | null; remaining: number } | null;
  paceTarget: number | null;
  weekly: { thisWeek: PeriodStats; lastWeek: PeriodStats };
};

/**
 * /progress에 필요한 숫자만 서버에서 미리 계산해 받는다 — 전체 rep 행을 내려받지 않는다.
 * (게스트는 로컬에 최대 5개뿐이라 이 엔드포인트를 쓰지 않고 그대로 클라이언트에서 계산한다.)
 */
export async function apiGetProgressSummary(): Promise<ProgressSummary> {
  const res = await fetch("/api/reps/summary");
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
 * setup_label/entry_price는 커밋 시점에 캐시된 값을 그대로 쓴다 — 매번 180봉을
 * 재생성하는 비용을 없애기 위함. 캐시 이전(마이그레이션 전) 행만 seed로 재생성한다.
 */
export function serverRepToRep(sr: ServerRep): Rep {
  // DB의 SQL NULL은 null로 온다(undefined가 아님) — 마이그레이션 이전 행 판별에 둘 다 잡아야 한다
  const cached = sr.setup_label != null && sr.entry_price != null;
  const scenario = cached ? null : generateScenario(sr.scenario_seed);
  const setupLabel = sr.setup_label ?? scenario!.setupLabel;
  const entryPrice = sr.entry_price ?? scenario!.candles[scenario!.decisionIndex - 1].close;

  return {
    id: sr.id,
    scenarioId: String(sr.scenario_seed),
    seed: sr.scenario_seed,
    setupLabel,
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
