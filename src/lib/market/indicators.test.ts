import { describe, expect, it } from "vitest";
import { describeCandles, sma } from "./indicators";
import type { Candle } from "./generator";

function fakeCandle(close: number, i: number): Candle {
  return { time: i, open: close, high: close, low: close, close, volume: 100 };
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
    const candles = closes.map(fakeCandle);
    const desc = describeCandles(candles);
    expect(desc).toMatch(/상승/);
    expect(desc).toMatch(/3봉 연속 하락/);
  });
});
