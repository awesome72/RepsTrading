import { describe, expect, it } from "vitest";
import { FEEDBACK_RULES, getFeedback } from "./rules";
import type { DecisionGrade, Rep } from "@/lib/rep/types";

function fakeRep(params: { r: number; grade: DecisionGrade; adhered: boolean }): Rep {
  return {
    id: `r-${Math.random()}`,
    scenarioId: "s",
    seed: 1,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: 0,
    plan: {
      setupChoice: "pullback",
      entryPrice: 100,
      stopPrice: 90,
      targetPrice: 120,
      targetR: 2,
    },
    adhered: params.adhered,
    exitReason: "target",
    decisionGrade: params.grade,
    result: { exitPrice: 100 + params.r * 10, rMultiple: params.r },
  };
}

describe("getFeedback", () => {
  it("마지막 rep이 D등급이면 손실 한도 메시지를 최우선으로 준다", () => {
    const reps = [
      fakeRep({ r: 1, grade: "A", adhered: true }),
      fakeRep({ r: -2, grade: "D", adhered: false }),
    ];
    expect(getFeedback(reps)).toBe(FEEDBACK_RULES[0].message);
  });

  it("최근 10회 중 3회 이상 계획을 어기면 습관 메시지를 준다", () => {
    const reps = [
      fakeRep({ r: 1, grade: "B", adhered: false }),
      fakeRep({ r: 1, grade: "B", adhered: false }),
      fakeRep({ r: 1, grade: "B", adhered: false }),
      fakeRep({ r: 1, grade: "B", adhered: true }),
    ];
    expect(getFeedback(reps)).toBe(FEEDBACK_RULES[1].message);
  });

  it("마지막 rep이 C/D인데 이익이면 운 메시지를 준다", () => {
    const reps = [fakeRep({ r: 2, grade: "C", adhered: false })];
    expect(getFeedback(reps)).toBe(FEEDBACK_RULES[2].message);
  });

  it("아무 조건도 안 맞으면 기본 메시지를 준다", () => {
    const reps = [fakeRep({ r: 1, grade: "A", adhered: true })];
    expect(getFeedback(reps)).toBe(FEEDBACK_RULES.at(-1)!.message);
  });

  it("빈 기록에서도 기본 메시지를 준다 (throw하지 않는다)", () => {
    expect(getFeedback([])).toBe(FEEDBACK_RULES.at(-1)!.message);
  });

  it("우선순위: D등급이 습관 규칙보다 먼저 걸린다", () => {
    const reps = [
      fakeRep({ r: -1, grade: "C", adhered: false }),
      fakeRep({ r: -1, grade: "C", adhered: false }),
      fakeRep({ r: -2, grade: "D", adhered: false }),
    ];
    expect(getFeedback(reps)).toBe(FEEDBACK_RULES[0].message);
  });
});
