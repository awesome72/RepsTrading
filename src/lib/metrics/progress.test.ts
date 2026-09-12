import { describe, expect, it } from "vitest";
import type { DecisionGrade, ExitReason, Rep } from "@/lib/rep/types";
import {
  paceEstimate,
  startOfLocalWeek,
  todayTradedCount,
  weeklyComparison,
} from "./progress";

// 기기 시간대와 무관하게 동작하도록 모든 시각을 로컬 시간으로 만든다
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
// 2026-09-12(토) 15시
const NOW = at(2026, 9, 12, 15);

function rep(t: number, opts: { grade?: DecisionGrade; adhered?: boolean; exitReason?: ExitReason; r?: number } = {}): Rep {
  return {
    id: `r-${t}-${Math.random()}`,
    scenarioId: "s",
    seed: 1,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: t,
    committedAt: t,
    plan: { setupChoice: "pullback", entryPrice: 100, stopPrice: 90, targetPrice: 120, targetR: 2 },
    adhered: opts.adhered ?? true,
    exitReason: opts.exitReason ?? "target",
    decisionGrade: opts.grade ?? "A",
    result: { exitPrice: 120, rMultiple: opts.r ?? 2 },
  };
}

describe("todayTradedCount", () => {
  it("오늘 0시 이후에 산 연습만 센다 (어제·지나간 것 제외)", () => {
    const reps = [
      rep(at(2026, 9, 11, 23)),
      rep(at(2026, 9, 12, 0)),
      rep(at(2026, 9, 12, 9)),
      rep(at(2026, 9, 12, 10), { exitReason: "pass" }),
    ];
    expect(todayTradedCount(reps, NOW)).toBe(2);
  });
});

describe("startOfLocalWeek", () => {
  it("월요일 0시를 주의 시작으로 본다 (토요일이면 5일 전 월요일)", () => {
    expect(startOfLocalWeek(NOW)).toBe(new Date(2026, 8, 7, 0).getTime());
    // 일요일은 전날까지의 주에 속한다
    expect(startOfLocalWeek(at(2026, 9, 13))).toBe(new Date(2026, 8, 7, 0).getTime());
  });
});

describe("weeklyComparison", () => {
  it("이번 주(월~지금)와 지난주를 나눠 같은 지표로 계산한다", () => {
    const reps = [
      // 지난주: 2회, 1회는 계획 어김(C)
      rep(at(2026, 9, 2), { grade: "A" }),
      rep(at(2026, 9, 3), { grade: "C", adhered: false, r: -0.5 }),
      // 이번 주: 3회, 전부 준수, A 2회 B 1회
      rep(at(2026, 9, 8), { grade: "A" }),
      rep(at(2026, 9, 9), { grade: "B" }),
      rep(at(2026, 9, 12, 9), { grade: "A" }),
    ];
    const { thisWeek, lastWeek } = weeklyComparison(reps, NOW);
    expect(thisWeek.count).toBe(3);
    expect(thisWeek.adherence).toBe(1);
    expect(thisWeek.aRate).toBeCloseTo(2 / 3);
    expect(lastWeek.count).toBe(2);
    expect(lastWeek.adherence).toBe(0.5);
  });
});

describe("paceEstimate", () => {
  it("최근 7일 하루 평균 속도로 남은 일수를 추정한다", () => {
    const reps = Array.from({ length: 14 }, (_, i) => rep(at(2026, 9, 12, 14) - i * 12 * 60 * 60 * 1000));
    const p = paceEstimate(reps, 300, NOW);
    expect(p.perDay).toBe(2);
    expect(p.remaining).toBe(286);
    expect(p.daysLeft).toBe(143);
  });

  it("최근 7일에 연습이 없으면 추정하지 않는다", () => {
    const p = paceEstimate([rep(at(2026, 8, 1))], 300, NOW);
    expect(p.daysLeft).toBeNull();
  });
});
