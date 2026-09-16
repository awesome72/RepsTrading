import { beforeEach, describe, expect, it } from "vitest";
import { missedSeeds, recordQuizAnswer, todayQuizScore, type QuizLogEntry } from "./quiz-log";
import type { QuizAnswer } from "./quiz";

function answer(seed: number, correct: boolean): QuizAnswer {
  return { seed, label: "pullback", choice: correct ? "pullback" : "breakout", correct };
}

beforeEach(() => {
  localStorage.clear();
});

describe("recordQuizAnswer", () => {
  it("기록을 추가하고 localStorage에 저장한다", () => {
    const log = recordQuizAnswer([], answer(1, true), 1000);
    expect(log).toEqual([{ seed: 1, label: "pullback", correct: true, at: 1000 }]);
    expect(JSON.parse(localStorage.getItem("reps.quiz.v1")!)).toEqual(log);
  });

  it("최근 500개만 남긴다", () => {
    const long: QuizLogEntry[] = Array.from({ length: 500 }, (_, i) => ({
      seed: i,
      label: "none",
      correct: true,
      at: i,
    }));
    const log = recordQuizAnswer(long, answer(999, true), 999);
    expect(log).toHaveLength(500);
    expect(log[0].seed).toBe(1); // 가장 오래된(seed 0)이 밀려났다
    expect(log.at(-1)?.seed).toBe(999);
  });
});

describe("todayQuizScore", () => {
  it("오늘 것만 센다", () => {
    const day1 = new Date(2026, 8, 15, 10).getTime();
    const day2 = new Date(2026, 8, 16, 10).getTime();
    const log: QuizLogEntry[] = [
      { seed: 1, label: "pullback", correct: true, at: day1 },
      { seed: 2, label: "pullback", correct: false, at: day2 },
      { seed: 3, label: "pullback", correct: true, at: day2 },
    ];
    expect(todayQuizScore(log, day2)).toEqual({ total: 2, correct: 1, accuracy: 0.5 });
  });

  it("기록이 없으면 0/0", () => {
    expect(todayQuizScore([])).toEqual({ total: 0, correct: 0, accuracy: 0 });
  });
});

describe("missedSeeds", () => {
  it("틀린 것만 돌려주고, 나중에 맞혔으면 뺀다", () => {
    const log: QuizLogEntry[] = [
      { seed: 1, label: "pullback", correct: false, at: 1 },
      { seed: 2, label: "breakout", correct: false, at: 2 },
      { seed: 1, label: "pullback", correct: true, at: 3 }, // 나중에 다시 풀어서 맞힘
    ];
    expect(missedSeeds(log)).toEqual([2]);
  });

  it("가장 최근에 틀린 것이 앞에 온다", () => {
    const log: QuizLogEntry[] = [
      { seed: 1, label: "pullback", correct: false, at: 1 },
      { seed: 2, label: "breakout", correct: false, at: 5 },
    ];
    expect(missedSeeds(log)).toEqual([2, 1]);
  });

  it("맞힌 것만 있으면 빈 배열", () => {
    expect(missedSeeds([{ seed: 1, label: "none", correct: true, at: 1 }])).toEqual([]);
  });
});
