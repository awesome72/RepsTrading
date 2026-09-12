import { describe, expect, it } from "vitest";
import { DEFAULT_MESSAGE, FEEDBACK_RULES, getFeedback } from "./rules";
import type { DecisionGrade, Rep } from "@/lib/rep/types";

function fakeRep(params: { r: number; grade: DecisionGrade; adhered: boolean; at?: number }): Rep {
  return {
    id: `r-${Math.random()}`,
    scenarioId: "s",
    seed: 1,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: params.at ?? 0,
    committedAt: params.at,
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
    expect(getFeedback(reps)).toBe(DEFAULT_MESSAGE);
  });

  it("빈 기록에서도 기본 메시지를 준다 (throw하지 않는다)", () => {
    expect(getFeedback([])).toBe(DEFAULT_MESSAGE);
  });

  it("우선순위: D등급이 습관 규칙보다 먼저 걸린다", () => {
    const reps = [
      fakeRep({ r: -1, grade: "C", adhered: false }),
      fakeRep({ r: -1, grade: "C", adhered: false }),
      fakeRep({ r: -2, grade: "D", adhered: false }),
    ];
    expect(getFeedback(reps)).toBe(FEEDBACK_RULES[0].message);
  });

  it("계획은 지켰지만 최근 B가 많아 A 비율이 70% 미만이면 판단 근거를 짚는다", () => {
    const reps = [
      ...Array.from({ length: 3 }, () => fakeRep({ r: 1, grade: "A", adhered: true })),
      ...Array.from({ length: 3 }, () => fakeRep({ r: 1, grade: "B", adhered: true })),
    ];
    expect(getFeedback(reps)).toBe(FEEDBACK_RULES.find((r) => r.id === "weak-judgment")!.message);
  });
});

describe("기본 메시지 — 오늘 진행 상황", () => {
  const now = new Date(2026, 8, 12, 15).getTime();
  const today = (n: number) =>
    // R이 들쭉날쭉해야 "실행 안정" 규칙(표본 충분)이 끼어들지 않는다
    Array.from({ length: n }, (_, i) =>
      fakeRep({ r: i % 2 === 0 ? 2 : -1, grade: "A", adhered: true, at: now - (i + 1) * 60_000 })
    );

  it("목표 전이면 몇 번째인지와 남은 횟수를 알려준다", () => {
    expect(getFeedback(today(3), { now, dailyGoal: 10 })).toBe("오늘 3번째 연습입니다. 7회 더 하면 오늘 목표(10회)입니다.");
  });

  it("목표를 채우면 멈춰도 된다고 알려준다", () => {
    expect(getFeedback(today(10), { now, dailyGoal: 10 })).toContain("오늘 목표 10회를 채웠습니다");
  });

  it("목표를 넘기면 쉬어가도 된다고 알려준다", () => {
    expect(getFeedback(today(12), { now, dailyGoal: 10 })).toContain("쉬어가도 괜찮습니다");
  });

  it("목표를 쓰지 않으면(게스트) 예전 기본 문장", () => {
    expect(getFeedback(today(3), { now, dailyGoal: null })).toBe(DEFAULT_MESSAGE);
  });
});
