import { type Rng, createRng, gaussian } from "./rng";

export type Regime = "uptrend" | "downtrend" | "sideways" | "volatile";

export type Candle = {
  time: number; // synthetic UNIX seconds — 실제 날짜 아님, 축 표시 금지
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const REGIMES: Regime[] = [
  "uptrend",
  "downtrend",
  "sideways",
  "volatile",
];

/** 레짐 전환 확률 행렬 (마르코프 체인). 행 = 현재 레짐, 값의 합은 1. */
export const REGIME_TRANSITIONS: Record<Regime, Record<Regime, number>> = {
  uptrend: { uptrend: 0.85, downtrend: 0.03, sideways: 0.1, volatile: 0.02 },
  downtrend: { uptrend: 0.03, downtrend: 0.85, sideways: 0.1, volatile: 0.02 },
  sideways: { uptrend: 0.12, downtrend: 0.12, sideways: 0.71, volatile: 0.05 },
  volatile: { uptrend: 0.2, downtrend: 0.2, sideways: 0.2, volatile: 0.4 },
};

/** 레짐별 일간 기대 로그수익률(드리프트) */
export const REGIME_DRIFT: Record<Regime, number> = {
  uptrend: 0.0015,
  downtrend: -0.0015,
  sideways: 0,
  volatile: 0,
};

export const DAILY_VOLATILITY = 0.018;

/** 레짐별 변동성 배수 (급등락은 기본 변동성의 2.5배) */
export const REGIME_VOLATILITY_MULTIPLIER: Record<Regime, number> = {
  uptrend: 1,
  downtrend: 1,
  sideways: 0.6,
  volatile: 2.5,
};

const DAY_SECONDS = 60 * 60 * 24;
const SYNTHETIC_EPOCH = 1_600_000_000; // 임의 기준 시각, 실제 날짜와 무관

export function nextRegime(current: Regime, rng: Rng): Regime {
  const row = REGIME_TRANSITIONS[current];
  const r = rng();
  let cumulative = 0;
  for (const regime of REGIMES) {
    cumulative += row[regime];
    if (r < cumulative) return regime;
  }
  return current;
}

/** 레짐에 따른 다음 종가 (기하 브라운 운동 1스텝) */
export function stepClose(prevClose: number, regime: Regime, rng: Rng): number {
  const drift = REGIME_DRIFT[regime];
  const vol = DAILY_VOLATILITY * REGIME_VOLATILITY_MULTIPLIER[regime];
  const z = gaussian(rng);
  const logReturn = drift - 0.5 * vol * vol + vol * z;
  return prevClose * Math.exp(logReturn);
}

/** 종가 시퀀스로부터 사실적인 OHLCV 봉을 구성한다 */
export function buildCandle(
  index: number,
  prevClose: number,
  close: number,
  regime: Regime,
  rng: Rng
): Candle {
  const vol = DAILY_VOLATILITY * REGIME_VOLATILITY_MULTIPLIER[regime];
  const gapPct = gaussian(rng) * vol * 0.3;
  const open = prevClose * (1 + gapPct);

  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);
  const upperWick = bodyHigh * Math.abs(gaussian(rng)) * vol * 0.6;
  const lowerWick = bodyLow * Math.abs(gaussian(rng)) * vol * 0.6;

  const high = bodyHigh + upperWick;
  const low = Math.max(bodyLow - lowerWick, 0.01);

  const priceChangePct = Math.abs(close - open) / open;
  const baseVolume = 100_000;
  const volume = Math.round(
    baseVolume * (1 + priceChangePct * 25) * (0.7 + rng() * 0.6)
  );

  return {
    time: SYNTHETIC_EPOCH + index * DAY_SECONDS,
    open,
    high,
    low,
    close,
    volume,
  };
}

export type GeneratedSeries = {
  candles: Candle[];
  regimes: Regime[];
};

/**
 * 시드값 기반으로 레짐 전환 마르코프 체인 + GBM으로 일봉 시계열을 생성한다.
 * 같은 seed는 항상 같은 결과를 낸다.
 */
export function generateSeries(params: {
  seed?: number;
  length: number;
  startPrice?: number;
  startRegime?: Regime;
  startIndex?: number;
  rng?: Rng;
}): GeneratedSeries {
  const { length, startPrice = 50_000, startRegime, startIndex = 0 } = params;
  const rng = params.rng ?? createRng(params.seed ?? 0);

  let regime: Regime = startRegime ?? REGIMES[Math.floor(rng() * REGIMES.length)];
  let prevClose = startPrice;

  const candles: Candle[] = [];
  const regimes: Regime[] = [];

  for (let i = 0; i < length; i++) {
    regime = nextRegime(regime, rng);
    const close = stepClose(prevClose, regime, rng);
    candles.push(buildCandle(startIndex + i, prevClose, close, regime, rng));
    regimes.push(regime);
    prevClose = close;
  }

  return { candles, regimes };
}
