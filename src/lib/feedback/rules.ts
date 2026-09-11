import type { Rep } from "@/lib/rep/types";
import { adherenceRate, decisionReps, requiredSample, setupAccuracy } from "@/lib/metrics/stats";

export type FeedbackRule = {
  id: string;
  message: string;
  /** reps = 방금 끝난 rep까지 포함한 전체 기록 */
  test: (reps: Rep[]) => boolean;
};

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
    message: "실행은 안정적입니다. 이제 횟수만 채우면 됩니다.",
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
    message: "잘 진행되고 있습니다. 다음 연습으로 넘어가세요.",
    test: () => true,
  },
];

export function getFeedback(reps: Rep[]): string {
  return (FEEDBACK_RULES.find((rule) => rule.test(reps)) ?? FEEDBACK_RULES.at(-1)!).message;
}
