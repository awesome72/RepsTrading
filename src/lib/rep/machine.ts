import type {
  DecisionGrade,
  ExitReason,
  Plan,
  Rep,
  RepResult,
  RepState,
} from "./types";
import type { SetupLabel } from "@/lib/market/scenario";
import { rMultiple } from "@/lib/metrics/r-multiple";

const ORDER: RepState[] = ["WATCHING", "COMMITTED", "EXECUTED", "GRADED", "REVEALED"];

export function canTransition(from: RepState, to: RepState): boolean {
  const fromIdx = ORDER.indexOf(from);
  const toIdx = ORDER.indexOf(to);
  return fromIdx !== -1 && toIdx === fromIdx + 1;
}

function assertTransition(rep: Rep, to: RepState) {
  if (!canTransition(rep.state, to)) {
    throw new Error(`잘못된 상태 전이입니다: ${rep.state} → ${to}`);
  }
}

export function createRep(params: {
  scenarioId: string;
  seed: number;
  setupLabel: SetupLabel;
  openedAt: number;
  guided?: boolean;
}): Rep {
  return {
    id: `rep-${params.seed}-${params.openedAt}`,
    scenarioId: params.scenarioId,
    seed: params.seed,
    setupLabel: params.setupLabel,
    guided: params.guided,
    state: "WATCHING",
    openedAt: params.openedAt,
  };
}

export function commitPlan(rep: Rep, plan: Plan, committedAt: number): Rep {
  assertTransition(rep, "COMMITTED");
  return {
    ...rep,
    state: "COMMITTED",
    plan,
    committedAt,
    inputSeconds: (committedAt - rep.openedAt) / 1000,
  };
}

/**
 * 재생 중 손절가를 내린다 — 계획에 없던 행동이라 이후 채점은 D로 고정된다.
 * 계획 자체(plan)는 그대로 두고, 실제로 적용되는 손절가만 따로 기록한다.
 */
export function moveStop(rep: Rep, newStopPrice: number): Rep {
  if (rep.state !== "COMMITTED" || !rep.plan) {
    throw new Error("재생 중에만 손절가를 옮길 수 있습니다.");
  }
  const current = rep.movedStopPrice ?? rep.plan.stopPrice;
  if (!(newStopPrice < current)) {
    throw new Error("손절가는 지금보다 낮은 값으로만 옮길 수 있습니다.");
  }
  return { ...rep, movedStopPrice: newStopPrice };
}

export function executeExit(
  rep: Rep,
  params: {
    exitPrice: number;
    exitReason: ExitReason;
    exitIndex: number;
    adhered: boolean;
  }
): Rep {
  assertTransition(rep, "EXECUTED");
  return {
    ...rep,
    state: "EXECUTED",
    exitPrice: params.exitPrice,
    exitReason: params.exitReason,
    exitIndex: params.exitIndex,
    adhered: params.adhered,
  };
}

/** 결과 계산은 오직 여기, 채점 완료 시점에만 일어난다 */
export function gradeDecision(rep: Rep, decisionGrade: DecisionGrade): Rep {
  assertTransition(rep, "GRADED");
  if (!rep.plan || rep.exitPrice === undefined) {
    throw new Error("계획과 청산 정보가 없으면 채점할 수 없습니다.");
  }
  const result: RepResult = {
    exitPrice: rep.exitPrice,
    rMultiple: rMultiple(rep.plan.entryPrice, rep.exitPrice, rep.plan.stopPrice),
  };
  return { ...rep, state: "GRADED", decisionGrade, result };
}

export function reveal(rep: Rep): Rep {
  assertTransition(rep, "REVEALED");
  assertRevealable(rep);
  return { ...rep, state: "REVEALED" };
}

/** GRADED 이전에는 어디서도 result를 읽을 수 없도록 하는 가드 */
export function assertRevealable(rep: Rep): asserts rep is Rep & { result: RepResult } {
  if (rep.state !== "GRADED" && rep.state !== "REVEALED") {
    throw new Error("채점(GRADED) 전에는 결과에 접근할 수 없습니다.");
  }
  if (!rep.result) {
    throw new Error("결과가 아직 계산되지 않았습니다.");
  }
}

export function getResult(rep: Rep): RepResult {
  assertRevealable(rep);
  return rep.result;
}

/**
 * "지나간다" — 계획을 세우지 않고 곧장 통과시키는 지름길.
 * 상태 머신의 순서(WATCHING→COMMITTED→EXECUTED→GRADED→REVEALED)는 그대로 지키되,
 * 중간 화면 없이 한 번에 REVEALED까지 진행한다. R은 항상 0(포지션을 잡지 않았으므로).
 */
export function passRep(rep: Rep, params: { price: number; now: number }): Rep {
  const committed = commitPlan(
    rep,
    {
      setupChoice: "other",
      entryPrice: params.price,
      stopPrice: params.price,
      targetPrice: params.price,
      targetR: 0,
    },
    params.now
  );
  const executed = executeExit(committed, {
    exitPrice: params.price,
    exitReason: "pass",
    exitIndex: 0,
    adhered: true,
  });
  const graded = gradeDecision(executed, "A");
  return reveal(graded);
}
