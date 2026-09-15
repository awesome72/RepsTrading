import type { Rep } from "@/lib/rep/types";

/** 비교할 만한 "평소"가 생기려면 같은 종류의 판단이 이만큼은 있어야 한다 */
export const MIN_DECISION_SAMPLES = 3;

export type DecisionKind = "pass" | "trade";

export function decisionKind(rep: Rep): DecisionKind {
  return rep.exitReason === "pass" ? "pass" : "trade";
}

/**
 * 같은 종류 판단의 결정 시간 중앙값(초). 표본이 부족하면 null.
 * 매매는 차트를 연 순간부터 계획을 저장할 때까지(계획 작성 포함), 지나가기는 누를 때까지라
 * 두 종류를 섞으면 "평소"가 왜곡된다 — 그래서 종류별로 따로 잰다. 가이드 연습은 뺀다.
 */
export function typicalDecisionSeconds(reps: Rep[], kind: DecisionKind): number | null {
  const samples = reps
    .filter((r) => !r.guided && decisionKind(r) === kind)
    .map((r) => r.inputSeconds)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s) && s > 0)
    .sort((a, b) => a - b);
  if (samples.length < MIN_DECISION_SAMPLES) return null;
  const mid = Math.floor(samples.length / 2);
  return samples.length % 2 === 1 ? samples[mid] : (samples[mid - 1] + samples[mid]) / 2;
}

export type DecisionPace = {
  tone: "fast" | "slow" | "normal";
  text: string;
};

function formatSeconds(s: number): string {
  if (s < 1) return "1초 미만";
  if (s < 60) return `${Math.round(s)}초`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return rest === 0 ? `${m}분` : `${m}분 ${rest}초`;
}

/**
 * 이번 결정 시간을 평소와 비교한 한 줄. 빠른 게 곧 나쁜 건 아니므로 판정하지 않고,
 * 평소와 크게 다를 때만 돌아볼 거리를 붙인다.
 */
export function describeDecisionPace(
  seconds: number,
  typical: number | null,
  kind: DecisionKind
): DecisionPace {
  const verb = kind === "pass" ? "지나가기까지" : "계획 저장까지";
  const head = `${verb} ${formatSeconds(seconds)}`;
  if (typical === null) return { tone: "normal", text: head };
  const base = `${head} · 평소 ${formatSeconds(typical)}`;
  if (seconds < typical * 0.5) {
    return { tone: "fast", text: `${base} — 평소보다 훨씬 빨랐습니다. 차트를 충분히 봤는지 돌아보세요.` };
  }
  if (seconds > typical * 2) {
    return { tone: "slow", text: `${base} — 평소보다 오래 고민했습니다. 무엇이 망설여졌는지 떠올려보세요.` };
  }
  return { tone: "normal", text: `${base} — 평소 속도입니다.` };
}
