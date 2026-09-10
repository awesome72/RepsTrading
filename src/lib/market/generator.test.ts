import { describe, expect, it } from "vitest";
import { generateSeries } from "./generator";

describe("generateSeries", () => {
  it("같은 seed는 항상 같은 결과를 낸다", () => {
    const a = generateSeries({ seed: 42, length: 50 });
    const b = generateSeries({ seed: 42, length: 50 });
    expect(a.candles).toEqual(b.candles);
    expect(a.regimes).toEqual(b.regimes);
  });

  it("다른 seed는 다른 결과를 낸다", () => {
    const a = generateSeries({ seed: 1, length: 50 });
    const b = generateSeries({ seed: 2, length: 50 });
    expect(a.candles).not.toEqual(b.candles);
  });

  it("요청한 길이만큼 봉을 생성한다", () => {
    const { candles } = generateSeries({ seed: 7, length: 180 });
    expect(candles).toHaveLength(180);
  });

  it("모든 봉은 OHLC 관계가 유효하다 (high가 최대, low가 최소)", () => {
    const { candles } = generateSeries({ seed: 7, length: 180 });
    for (const c of candles) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(c.volume).toBeGreaterThan(0);
    }
  });

  it("시간은 봉마다 하루씩 증가한다", () => {
    const { candles } = generateSeries({ seed: 7, length: 10 });
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].time - candles[i - 1].time).toBe(60 * 60 * 24);
    }
  });
});
