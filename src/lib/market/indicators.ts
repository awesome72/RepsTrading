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

/**
 * 화면을 못 보는 사용자를 위한 차트 요약 텍스트.
 * 예: "최근 20봉 상승, 최근 3봉 연속 하락, 20일선 근접."
 */
export function describeCandles(candles: Candle[]): string {
  if (candles.length < 5) return "차트 데이터가 아직 충분하지 않습니다.";

  const closes = candles.map((c) => c.close);
  const last = closes[closes.length - 1];
  const lookback = Math.min(20, closes.length);
  const first = closes[closes.length - lookback];
  const overallPct = ((last - first) / first) * 100;
  const overallDir = overallPct > 1 ? "상승" : overallPct < -1 ? "하락" : "횡보";

  let downStreak = 0;
  for (let i = closes.length - 1; i > 0 && closes[i] < closes[i - 1]; i--) downStreak++;
  let upStreak = 0;
  for (let i = closes.length - 1; i > 0 && closes[i] > closes[i - 1]; i--) upStreak++;

  const ma20 = smaSeries(candles, 20).at(-1);
  const nearMa = ma20 !== undefined && Math.abs(last - ma20) / ma20 < 0.02;

  const parts = [`최근 ${lookback}봉 ${overallDir}`];
  if (downStreak >= 2) parts.push(`최근 ${downStreak}봉 연속 하락`);
  else if (upStreak >= 2) parts.push(`최근 ${upStreak}봉 연속 상승`);
  if (nearMa) parts.push("20일선 근접");

  return parts.join(", ") + ".";
}

export type StopReasonCheck = {
  belowPriorLow: boolean;
  belowMa20: boolean;
};

/**
 * 손절가가 "직전 저점 아래" 또는 "20일선 아래"처럼 화면에 보이는 구조에 걸쳐 있는지 판별한다.
 * 계획 작성 화면에서 입력 순간 보여주는 용도 — 등급을 매기지 않는다(그건 여전히 본인 판단 문항).
 */
export function checkStopReasoning(candles: Candle[], stopPrice: number): StopReasonCheck {
  // 지금 봉 자체가 저점이면 "직전" 저점이 아니므로 제외하고, 그 앞 19봉에서만 찾는다
  const priorCandles = candles.slice(-20, -1);
  const priorLow = priorCandles.length > 0 ? Math.min(...priorCandles.map((c) => c.low)) : undefined;
  const ma20 = smaSeries(candles, 20).at(-1);

  return {
    belowPriorLow: priorLow !== undefined && stopPrice < priorLow,
    belowMa20: ma20 !== undefined && stopPrice < ma20,
  };
}
