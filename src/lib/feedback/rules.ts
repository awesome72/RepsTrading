import type { Rep } from "@/lib/rep/types";
import { adherenceRate, decisionReps, requiredSample, setupAccuracy } from "@/lib/metrics/stats";
import { todayTradedCount } from "@/lib/metrics/progress";

export type FeedbackContext = {
  now: number;
  /** 하루 목표 횟수. 게스트처럼 목표를 쓰지 않는 경우 null */
  dailyGoal: number | null;
};

export type FeedbackRule = {
  id: string;
  message: string | ((reps: Rep[], ctx: FeedbackContext) => string);
  /** reps = 방금 끝난 rep까지 포함한 전체 기록 */
  test: (reps: Rep[]) => boolean;
};

export const DEFAULT_MESSAGE = "잘 진행되고 있습니다. 다음 연습으로 넘어가세요.";

function tradedOnly(reps: Rep[]): Rep[] {
  return reps.filter((r) => r.exitReason !== "pass" && !r.guided && r.result);
}

function lastN(reps: Rep[], n: number): Rep[] {
  return tradedOnly(reps).slice(-n);
}

/**
 * 우선순위 배열 — 위에서부터 검사해 처음 조건이 맞는 것 하나만 쓴다.
 * LLM을 호출하지 않는다: 느리고, 매번 달라지고, 틀리기 때문이다.
 */
export const FEEDBACK_RULES: FeedbackRule[] = [
  {
    id: "grade-d",
    message:
      "손절가를 내리는 순간 손실 한도가 사라집니다. 다음 연습에서는 정한 손절을 그대로 두세요.",
    test: (reps) => tradedOnly(reps).at(-1)?.decisionGrade === "D",
  },
  {
    id: "frequent-breach",
    message: "최근에 계획을 자주 바꾸고 있습니다. 실력보다 습관 문제일 가능성이 큽니다.",
    test: (reps) => lastN(reps, 10).filter((r) => r.adhered === false).length >= 3,
  },
  {
    id: "lucky-bad",
    message: "이번엔 운이 좋았습니다. 같은 방식을 10번 하면 대부분 잃습니다.",
    test: (reps) => {
      const last = tradedOnly(reps).at(-1);
      if (!last) return false;
      const badGrade = last.decisionGrade === "C" || last.decisionGrade === "D";
      return badGrade && (last.result?.rMultiple ?? 0) > 0;
    },
  },
  {
    id: "weak-judgment",
    message:
      "계획은 지키고 있지만 판단 근거가 약한 거래(B)가 많습니다. 사기 전에 셋업 모양과 손절 근거부터 확인하세요 — 1단계를 통과하려면 A가 70% 이상이어야 합니다.",
    // 계획을 지킨 최근 거래 중 A(근거까지 분명) 비율이 게이트 기준(70%)에 못 미치는가
    test: (reps) => {
      const followed = lastN(reps, 10).filter((r) => r.decisionGrade === "A" || r.decisionGrade === "B");
      if (followed.length < 5) return false;
      return followed.filter((r) => r.decisionGrade === "A").length / followed.length < 0.7;
    },
  },
  {
    id: "setup-recognition",
    message:
      "차트 모양을 구분하는 연습이 더 필요합니다. 눌림목과 돌파의 차이를 다시 보고, 셋업이 아닌 곳은 지나가세요.",
    // 지나간 판단까지 포함한 최근 10번의 판단으로 본다
    test: (reps) => {
      const recent = decisionReps(reps).slice(-10);
      return recent.length > 0 && setupAccuracy(recent) <= 0.5;
    },
  },
  {
    id: "stable-execution",
    // 안정된 사용자는 매번 이 규칙에 걸리므로, 같은 문장만 반복되지 않게 오늘 진행 상황을 붙인다
    message: (reps, ctx) => {
      const base = "실행은 안정적입니다. 이제 횟수만 채우면 됩니다.";
      if (ctx.dailyGoal === null) return base;
      return `${base} 오늘 ${todayTradedCount(reps, ctx.now)}/${ctx.dailyGoal}회.`;
    },
    test: (reps) => {
      const traded = tradedOnly(reps);
      if (traded.length === 0) return false;
      const nStar = requiredSample(reps);
      const halfway = Number.isFinite(nStar) && traded.length >= nStar / 2;
      return adherenceRate(reps) >= 0.95 && halfway;
    },
  },
  {
    id: "default",
    // 매번 같은 문장이 반복되지 않도록, 특별히 짚을 게 없을 땐 오늘 진행 상황을 알려준다
    message: (reps, ctx) => {
      if (ctx.dailyGoal === null) return DEFAULT_MESSAGE;
      const goal = ctx.dailyGoal;
      const n = todayTradedCount(reps, ctx.now);
      if (n < goal) return `오늘 ${n}번째 연습입니다. ${goal - n}회 더 하면 오늘 목표(${goal}회)입니다.`;
      if (n === goal) return `오늘 목표 ${goal}회를 채웠습니다. 여기서 멈춰도 되고, 더 해도 됩니다.`;
      return `오늘 ${n}회째입니다. 목표는 이미 채웠으니, 집중이 흐려졌다면 쉬어가도 괜찮습니다.`;
    },
    test: () => true,
  },
];

export function getFeedback(reps: Rep[], ctx: Partial<FeedbackContext> = {}): string {
  const context: FeedbackContext = { now: Date.now(), dailyGoal: null, ...ctx };
  const rule = FEEDBACK_RULES.find((r) => r.test(reps)) ?? FEEDBACK_RULES.at(-1)!;
  return typeof rule.message === "function" ? rule.message(reps, context) : rule.message;
}
