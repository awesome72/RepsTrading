import { describe, expect, it } from "vitest";
import { checkStopReasoning, describeCandles, sma } from "./indicators";
import type { Candle } from "./generator";

function fakeCandle(close: number, i: number, low = close): Candle {
  return { time: i, open: close, high: close, low, close, volume: 100 };
}

describe("sma", () => {
  it("period 미만이면 undefined", () => {
    expect(sma([1, 2, 3], 5, 2)).toBeUndefined();
  });

  it("단순이동평균을 정확히 계산한다", () => {
    const closes = [1, 2, 3, 4, 5];
    expect(sma(closes, 3, 4)).toBeCloseTo((3 + 4 + 5) / 3);
  });
});

describe("describeCandles", () => {
  it("데이터가 부족하면 안내 문구를 반환한다", () => {
    expect(describeCandles([fakeCandle(100, 0)])).toMatch(/충분하지/);
  });

  it("상승 후 연속 하락을 감지한다", () => {
    const closes = [100, 102, 104, 106, 108, 110, 109, 108, 107];
    const candles = closes.map((c, i) => fakeCandle(c, i));
    const desc = describeCandles(candles);
    expect(desc).toMatch(/상승/);
    expect(desc).toMatch(/3봉 연속 하락/);
  });
});

describe("checkStopReasoning", () => {
  it("직전 저점보다 낮은 손절가는 belowPriorLow", () => {
    // 직전 저점(마지막 봉 제외) = 95, 마지막 봉만 100으로 올라옴
    const candles = [
      ...Array.from({ length: 19 }, (_, i) => fakeCandle(100, i, 95 + (i % 3))),
      fakeCandle(100, 19),
    ];
    expect(checkStopReasoning(candles, 90).belowPriorLow).toBe(true);
    expect(checkStopReasoning(candles, 96).belowPriorLow).toBe(false);
  });

  it("20일선보다 낮은 손절가는 belowMa20", () => {
    const candles = Array.from({ length: 20 }, (_, i) => fakeCandle(100, i));
    expect(checkStopReasoning(candles, 99).belowMa20).toBe(true);
    expect(checkStopReasoning(candles, 101).belowMa20).toBe(false);
  });

  it("구조 근거가 없으면 둘 다 false (퍼센트로만 정한 경우)", () => {
    // 상승 추세: 직전 저점(80)도, 20일선(90.5)도 손절가(92)보다 낮다 — 구조적 근거가 아니다
    const candles = Array.from({ length: 20 }, (_, i) => fakeCandle(81 + i, i, 80 + i));
    const result = checkStopReasoning(candles, 92);
    expect(result.belowPriorLow).toBe(false);
    expect(result.belowMa20).toBe(false);
  });

  it("봉이 20개 미만이면 20일선 판정은 항상 false", () => {
    const candles = Array.from({ length: 5 }, (_, i) => fakeCandle(100, i, 90));
    expect(checkStopReasoning(candles, 50).belowMa20).toBe(false);
  });
});
