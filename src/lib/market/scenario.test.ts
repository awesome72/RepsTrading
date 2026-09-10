import { describe, expect, it } from "vitest";
import { generateScenario, visibleCandles, DECISION_INDEX, TOTAL_LENGTH } from "./scenario";

describe("generateScenario", () => {
  it("같은 seed는 같은 시나리오를 낸다", () => {
    const a = generateScenario(123);
    const b = generateScenario(123);
    expect(a.setupLabel).toBe(b.setupLabel);
    expect(a.candles).toEqual(b.candles);
  });

  it("총 180봉, decisionIndex는 120이다", () => {
    const s = generateScenario(1);
    expect(s.candles).toHaveLength(TOTAL_LENGTH);
    expect(s.decisionIndex).toBe(DECISION_INDEX);
  });

  it("200개 시나리오의 setupLabel 분포가 대략 35/35/30이다", () => {
    const counts = { pullback: 0, breakout: 0, none: 0 };
    for (let seed = 0; seed < 200; seed++) {
      const s = generateScenario(seed);
      counts[s.setupLabel]++;
    }
    expect(counts.pullback / 200).toBeGreaterThan(0.25);
    expect(counts.pullback / 200).toBeLessThan(0.45);
    expect(counts.breakout / 200).toBeGreaterThan(0.25);
    expect(counts.breakout / 200).toBeLessThan(0.45);
    expect(counts.none / 200).toBeGreaterThan(0.2);
    expect(counts.none / 200).toBeLessThan(0.4);
  });

  it("모든 봉의 OHLC 관계가 유효하다", () => {
    const s = generateScenario(55);
    for (const c of s.candles) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    }
  });
});

describe("visibleCandles", () => {
  it("decisionIndex 이후 봉은 절대 포함하지 않는다", () => {
    const s = generateScenario(9);
    const visible = visibleCandles(s);
    expect(visible).toHaveLength(s.decisionIndex);
    expect(visible[visible.length - 1].time).toBe(s.candles[s.decisionIndex - 1].time);
  });

  it("revealCount만큼 추가로 공개할 수 있다", () => {
    const s = generateScenario(9);
    const visible = visibleCandles(s, 5);
    expect(visible).toHaveLength(s.decisionIndex + 5);
  });
});
