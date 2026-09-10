import type { SetupLabel } from "@/lib/market/scenario";

/** 상태 전이는 이 순서로만 진행된다: WATCHING → COMMITTED → EXECUTED → GRADED → REVEALED */
export type RepState = "WATCHING" | "COMMITTED" | "EXECUTED" | "GRADED" | "REVEALED";

/** 사용자가 고른 셋업 모양. 정답(scenario.setupLabel)과 별개다 */
export type SetupChoice = "pullback" | "breakout" | "other";

export type ExitReason = "stop" | "target" | "manual" | "timeout" | "pass";

export type DecisionGrade = "A" | "B" | "C" | "D";

export type Plan = {
  setupChoice: SetupChoice;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  targetR: number;
};

export type RepResult = {
  exitPrice: number;
  rMultiple: number;
};

export type Rep = {
  id: string;
  scenarioId: string;
  seed: number;
  setupLabel: SetupLabel; // 정답 — GRADED 전까지 어떤 화면에도 노출하지 않는다
  state: RepState;
  openedAt: number;
  committedAt?: number;
  inputSeconds?: number;
  plan?: Plan;
  adhered?: boolean;
  exitReason?: ExitReason;
  exitIndex?: number;
  exitPrice?: number; // 청산 사실 — EXECUTED 시점에 기록 (R/손익 "계산값"과는 다르다)
  decisionGrade?: DecisionGrade;
  /** GRADED 미만 상태에서는 반드시 undefined여야 한다 */
  result?: RepResult;
  /** 온보딩 가이드 연습 — 통계·게이트 판정에서 항상 제외한다 */
  guided?: boolean;
};
