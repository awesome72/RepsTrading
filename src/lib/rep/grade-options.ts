import type { DecisionGrade } from "./types";

/**
 * 등급 기준 — 채점 화면과 결과 화면이 같은 문구를 쓴다.
 * 실행(지켰는지)은 시스템이 기록으로 판정하고, A와 B만 사용자의 판단 점검으로 갈린다.
 */
export const GRADE_OPTIONS: { value: DecisionGrade; label: string; desc: string }[] = [
  {
    value: "A",
    label: "계획대로 실행했고, 판단 근거도 분명했다",
    desc: "셋업이 분명했고 손절가에도 차트 근거가 있었습니다.",
  },
  {
    value: "B",
    label: "계획대로 실행했지만, 판단 근거가 약했다",
    desc: "실행은 지켰지만 셋업이 애매했거나 손절가를 근거 없이 정했습니다.",
  },
  {
    value: "C",
    label: "계획보다 먼저 팔았다 (손실 한도 안)",
    desc: "정해둔 손절·목표에 닿기 전에 직접 청산했습니다.",
  },
  {
    value: "D",
    label: "손절을 내리거나 무시했다",
    desc: "정해둔 손실 한도(1R)를 지키지 않았습니다.",
  },
];

export function getGradeOption(grade: DecisionGrade | undefined) {
  return GRADE_OPTIONS.find((g) => g.value === grade);
}

/** 계획을 지켰을 때만 묻는 두 가지 판단 점검. 둘 다 "예"면 A, 하나라도 "아니오"면 B */
export const JUDGMENT_QUESTIONS = [
  {
    id: "setupClear",
    question: "산 이유가 된 셋업 모양이 분명했나요?",
    help: "‘아마 눌림목 같은데…’처럼 애매했다면 아니오입니다.",
  },
  {
    id: "stopReasoned",
    question: "손절가를 차트 근거로 정했나요?",
    help: "직전 저점 아래, 20일선 아래처럼 차트에서 이유를 댈 수 있으면 예. 퍼센트로만 정했다면 아니오입니다.",
  },
] as const;

export function gradeFromAnswers(answers: boolean[]): Extract<DecisionGrade, "A" | "B"> {
  return answers.every(Boolean) ? "A" : "B";
}
