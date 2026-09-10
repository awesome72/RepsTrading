import type { Candle } from "./generator";

/** period 미만 구간은 undefined. closes[idx] 기준 후행 단순이동평균 */
export function sma(closes: number[], period: number, idx: number): number | undefined {
  if (idx - period + 1 < 0) return undefined;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += closes[i];
  return sum / period;
}

/** 캔들 배열 전체에 대한 이동평균선 (차트 표시용) */
export function smaSeries(candles: Candle[], period: number): (number | undefined)[] {
  const closes = candles.map((c) => c.close);
  return candles.map((_, idx) => sma(closes, period, idx));
}
