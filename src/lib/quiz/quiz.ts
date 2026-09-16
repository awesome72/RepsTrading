import { FULL_MIX, pickSeedForMix, setupLabelForSeed, type SetupLabel } from "@/lib/market/scenario";

export type QuizAnswer = {
  seed: number;
  /** 이 차트의 정답 셋업 */
  label: SetupLabel;
  /** 사용자가 고른 셋업 */
  choice: SetupLabel;
  correct: boolean;
};

export type QuizScore = {
  total: number;
  correct: number;
  /** 0~1. 아직 푼 문제가 없으면 0 */
  accuracy: number;
};

/**
 * 다음 문제의 차트 seed. 세 종류(눌림목·돌파·셋업 없음)가 고루 나오도록 뽑는다 —
 * 게이트 단계와 무관하게 항상 섞는다. 판별 연습이 이 모드의 목적이기 때문이다.
 */
export function nextQuizSeed(random: () => number = Math.random): number {
  return pickSeedForMix(FULL_MIX, random);
}

export function gradeQuizAnswer(seed: number, choice: SetupLabel): QuizAnswer {
  const label = setupLabelForSeed(seed);
  return { seed, label, choice, correct: label === choice };
}

export function quizScore(answers: QuizAnswer[]): QuizScore {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  return { total, correct, accuracy: total === 0 ? 0 : correct / total };
}
