import type { DecisionGrade } from "./types";

/** 채점 화면과 리빌 화면이 함께 쓰는 등급 기준 — 두 화면 어디서든 같은 문구를 보게 한다. */
export const GRADE_OPTIONS: { value: DecisionGrade; label: string; desc: string }[] = [
  {
    value: "A",
    label: "계획대로 하고 손절도 지켰다",
    desc: "설정한 손절가와 목표가를 그대로 따랐습니다.",
  },
  {
    value: "B",
    label: "대체로 지켰지만 조금 흔들렸다",
    desc: "판단은 지켰지만 중간에 살짝 흔들렸습니다.",
  },
  {
    value: "C",
    label: "규칙을 어겼다 (다만 손실 한도는 넘지 않았다)",
    desc: "계획을 벗어났지만 정해둔 손실 한도 안에서 끝났습니다.",
  },
  {
    value: "D",
    label: "손실 한도를 넘겼거나 손절을 무시했다",
    desc: "손절을 무시했거나 정해둔 손실 한도를 넘겼습니다.",
  },
];

export function getGradeOption(grade: DecisionGrade | undefined) {
  return GRADE_OPTIONS.find((g) => g.value === grade);
}
