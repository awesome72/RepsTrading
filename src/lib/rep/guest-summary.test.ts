import { describe, expect, it } from "vitest";
import { guestSummary } from "./guest-summary";
import type { Rep } from "./types";

function trade(r: number, adhered: boolean, correct = true): Rep {
  return {
    id: Math.random().toString(36),
    scenarioId: "s",
    seed: 1,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: 0,
    plan: { setupChoice: correct ? "pullback" : "breakout", entryPrice: 100, stopPrice: 97, targetPrice: 106, targetR: 2 },
    exitReason: adhered ? "stop" : "manual",
    adhered,
    decisionGrade: adhered ? "A" : "C",
    result: { exitPrice: 100 + r * 3, rMultiple: r },
  };
}

function pass(label: "none" | "pullback"): Rep {
  return {
    id: Math.random().toString(36),
    scenarioId: "s",
    seed: 1,
    setupLabel: label,
    state: "REVEALED",
    openedAt: 0,
    exitReason: "pass",
    result: { exitPrice: 100, rMultiple: 0 },
  };
}

describe("guestSummary", () => {
  it("산 것과 지나간 것을 모두 판단 수로 센다", () => {
    const s = guestSummary([trade(2, true), trade(-1, true), pass("none"), pass("pullback"), trade(-1, false)]);
    expect(s.decisions).toBe(5);
    expect(s.traded).toBe(3);
  });

  it("계획 지킴·평균 R은 산 판단만으로 계산한다", () => {
    const s = guestSummary([trade(2, true), trade(-1, true), trade(-1, false), pass("none")]);
    expect(s.adherence).toBeCloseTo(2 / 3);
    expect(s.expectancy).toBeCloseTo(0);
  });

  it("판별 정확도는 지나간 판단까지 포함한다 (셋업 없는 곳을 지나가면 정답)", () => {
    const s = guestSummary([trade(1, true, true), trade(1, true, false), pass("none"), pass("pullback")]);
    expect(s.accuracy).toBeCloseTo(2 / 4);
  });

  it("전부 지나갔으면 계획 지킴·평균 R은 없음(null) — 0%로 오해되지 않게", () => {
    const s = guestSummary([pass("none"), pass("none")]);
    expect(s.adherence).toBeNull();
    expect(s.expectancy).toBeNull();
    expect(s.accuracy).toBe(1);
  });

  it("기록이 없으면 모두 null", () => {
    expect(guestSummary([])).toEqual({ decisions: 0, traded: 0, adherence: null, expectancy: null, accuracy: null });
  });

  it("가이드(온보딩) 연습은 세지 않는다", () => {
    const s = guestSummary([{ ...trade(2, true), guided: true }, trade(-1, true)]);
    expect(s.decisions).toBe(1);
    expect(s.expectancy).toBe(-1);
  });
});
