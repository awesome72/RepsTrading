import { describe, expect, it } from "vitest";
import { gradeQuizAnswer, nextQuizSeed, quizScore } from "./quiz";
import { setupLabelForSeed } from "@/lib/market/scenario";

describe("nextQuizSeed", () => {
  it("실제로 셋업이 정해지는 seed를 준다", () => {
    for (let i = 0; i < 20; i++) {
      const seed = nextQuizSeed();
      expect(["pullback", "breakout", "none"]).toContain(setupLabelForSeed(seed));
    }
  });

  it("같은 난수열이면 같은 seed가 나온다 (재현 가능)", () => {
    const fixed = () => 0.42;
    expect(nextQuizSeed(fixed)).toBe(nextQuizSeed(fixed));
  });
});

describe("gradeQuizAnswer", () => {
  it("정답 셋업과 같으면 correct", () => {
    const seed = nextQuizSeed();
    const label = setupLabelForSeed(seed);
    expect(gradeQuizAnswer(seed, label).correct).toBe(true);
  });

  it("다르면 오답이고, 정답 셋업을 함께 돌려준다", () => {
    const seed = nextQuizSeed();
    const label = setupLabelForSeed(seed);
    const wrong = label === "none" ? "pullback" : "none";
    const answer = gradeQuizAnswer(seed, wrong);
    expect(answer.correct).toBe(false);
    expect(answer.label).toBe(label);
  });
});

describe("quizScore", () => {
  it("빈 기록은 0/0, 정확도 0", () => {
    expect(quizScore([])).toEqual({ total: 0, correct: 0, accuracy: 0 });
  });

  it("맞힌 개수와 비율을 센다", () => {
    const a = (correct: boolean) => ({ seed: 1, label: "none" as const, choice: "none" as const, correct });
    expect(quizScore([a(true), a(false), a(true), a(true)])).toEqual({
      total: 4,
      correct: 3,
      accuracy: 0.75,
    });
  });
});
