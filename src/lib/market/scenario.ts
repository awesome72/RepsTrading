import {
  type Candle,
  type Regime,
  generateSeries,
  stepClose,
  buildCandle,
} from "./generator";
import { type Rng, createRng, randInt, uniform } from "./rng";
import { sma } from "./indicators";

export type SetupLabel = "pullback" | "breakout" | "none";

export type Scenario = {
  id: string;
  seed: number;
  candles: Candle[]; // 총 180봉 (decisionIndex 이후 60봉은 재생/청산용)
  decisionIndex: number; // 120번째 봉에서 판단
  setupLabel: SetupLabel; // 정답 — 사용자에게 절대 노출 금지
  regime: Regime;
};

export const TOTAL_LENGTH = 180;
export const DECISION_INDEX = 120;
const START_PRICE = 50_000;

/** pullback 35% / breakout 35% / none 30% */
export function pickSetupLabel(rng: Rng): SetupLabel {
  const r = rng();
  if (r < 0.35) return "pullback";
  if (r < 0.7) return "breakout";
  return "none";
}

function isPullbackShape(closes: number[], idx: number): boolean {
  const ma = sma(closes, 20, idx);
  const maPrev = sma(closes, 20, idx - 10);
  if (ma === undefined || maPrev === undefined) return false;
  const price = closes[idx];
  const nearMa = Math.abs(price - ma) / ma < 0.02;
  const maRising = ma > maPrev;
  const localPeak = Math.max(...closes.slice(Math.max(0, idx - 6), idx));
  const pulledBack = price < localPeak * 0.995;
  return nearMa && maRising && pulledBack;
}

function isBreakoutShape(highs: number[], closes: number[], idx: number): boolean {
  if (idx - 15 < 0) return false;
  const windowHighs = highs.slice(idx - 15, idx);
  const rangeMax = Math.max(...windowHighs);
  const rangeMin = Math.min(...windowHighs);
  const tight = (rangeMax - rangeMin) / rangeMax < 0.08;
  const breaksOut = closes[idx] > rangeMax * 1.005;
  return tight && breaksOut;
}

/** 지정한 레짐으로 강제 진행 (마르코프 전환 없이) */
function stepFixedRegime(
  count: number,
  regime: Regime,
  prevCloseIn: number,
  startIndex: number,
  rng: Rng
): Candle[] {
  let prevClose = prevCloseIn;
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const close = stepClose(prevClose, regime, rng);
    candles.push(buildCandle(startIndex + i, prevClose, close, regime, rng));
    prevClose = close;
  }
  return candles;
}

export function generateScenario(seed?: number): Scenario {
  const actualSeed = seed ?? Math.floor(Math.random() * 1_000_000_000);
  const rng = createRng(actualSeed);
  const label = pickSetupLabel(rng);

  const windowLen =
    label === "pullback" ? 15 + randInt(rng, 3, 5) : label === "breakout" ? 16 : 20;
  const preLen = DECISION_INDEX - windowLen;

  const background = generateSeries({ length: preLen, startPrice: START_PRICE, rng });
  const closes = background.candles.map((c) => c.close);
  const highs = background.candles.map((c) => c.high);
  let prevClose = closes[closes.length - 1] ?? START_PRICE;

  let windowCandles: Candle[] = [];
  let windowRegime: Regime;

  if (label === "pullback") {
    const pullbackLen = windowLen - 15;
    const uptrend = stepFixedRegime(15, "uptrend", prevClose, preLen, rng);
    windowCandles = windowCandles.concat(uptrend);
    prevClose = uptrend[uptrend.length - 1].close;
    closes.push(...uptrend.map((c) => c.close));
    highs.push(...uptrend.map((c) => c.high));

    const pullback = stepFixedRegime(
      pullbackLen,
      "downtrend",
      prevClose,
      preLen + 15,
      rng
    );
    windowCandles = windowCandles.concat(pullback);
    prevClose = pullback[pullback.length - 1].close;
    closes.push(...pullback.map((c) => c.close));
    highs.push(...pullback.map((c) => c.high));
    windowRegime = "uptrend";

    // 20일선 근접 보정: 오차가 크면 마지막 봉 종가를 20일선 부근으로 당긴다
    const lastIdx = closes.length - 1;
    if (!isPullbackShape(closes, lastIdx)) {
      const ma = sma(closes, 20, lastIdx) ?? prevClose;
      const target = ma * uniform(rng, 0.995, 1.005);
      const fixed = buildCandle(
        preLen + windowLen - 1,
        closes[lastIdx - 1],
        target,
        "downtrend",
        rng
      );
      windowCandles[windowCandles.length - 1] = fixed;
      closes[lastIdx] = target;
      prevClose = target;
    }
  } else if (label === "breakout") {
    const sideways = stepFixedRegime(15, "sideways", prevClose, preLen, rng);
    windowCandles = windowCandles.concat(sideways);
    prevClose = sideways[sideways.length - 1].close;
    closes.push(...sideways.map((c) => c.close));
    highs.push(...sideways.map((c) => c.high));
    windowRegime = "sideways";

    const rangeMax = Math.max(...sideways.map((c) => c.high));
    const target = rangeMax * uniform(rng, 1.01, 1.03);
    const breakoutCandle = buildCandle(
      preLen + 15,
      prevClose,
      target,
      "uptrend",
      rng
    );
    windowCandles.push(breakoutCandle);
    closes.push(target);
    highs.push(breakoutCandle.high);
    prevClose = target;
  } else {
    const natural = generateSeries({
      length: windowLen,
      startPrice: prevClose,
      startIndex: preLen,
      rng,
    });
    windowCandles = natural.candles;
    windowRegime = natural.regimes[natural.regimes.length - 1];
    closes.push(...natural.candles.map((c) => c.close));
    highs.push(...natural.candles.map((c) => c.high));
    prevClose = closes[closes.length - 1];

    // none인데 우연히 셋업 모양이 나오면 마지막 봉을 살짝 눌러서 조건을 깬다
    const lastIdx = closes.length - 1;
    if (isPullbackShape(closes, lastIdx) || isBreakoutShape(highs, closes, lastIdx)) {
      const ma = sma(closes, 20, lastIdx);
      const corrected = ma !== undefined ? ma * uniform(rng, 0.94, 0.97) : prevClose * 0.97;
      const fixed = buildCandle(
        preLen + windowLen - 1,
        closes[lastIdx - 1],
        corrected,
        windowRegime,
        rng
      );
      windowCandles[windowCandles.length - 1] = fixed;
      closes[lastIdx] = corrected;
      prevClose = corrected;
    }
  }

  const remaining = TOTAL_LENGTH - DECISION_INDEX;
  const future = generateSeries({
    length: remaining,
    startPrice: prevClose,
    startRegime: windowRegime,
    startIndex: DECISION_INDEX,
    rng,
  });

  const candles = [...background.candles, ...windowCandles, ...future.candles];

  return {
    id: `rep-${actualSeed}`,
    seed: actualSeed,
    candles,
    decisionIndex: DECISION_INDEX,
    setupLabel: label,
    regime: windowRegime,
  };
}

/** seed만으로 정답 셋업을 알아낸다 — generateScenario의 첫 난수와 같은 값이라 차트 전체를 만들 필요가 없다 */
export function setupLabelForSeed(seed: number): SetupLabel {
  return pickSetupLabel(createRng(seed));
}

/** 어떤 셋업을 얼마나 자주 낼지 (합이 1) */
export type SetupMix = Record<SetupLabel, number>;

export const FULL_MIX: SetupMix = { pullback: 0.35, breakout: 0.35, none: 0.3 };

/**
 * 1단계(실행)는 고른 셋업 하나를 반복하는 단계라 그 셋업과 "셋업 없음"만 낸다.
 * 다른 셋업 차트를 섞으면, 자기 셋업만 사고 나머지는 지나가는 올바른 습관이 오답 처리되기 때문이다.
 * 2단계(판별)부터는 모든 셋업을 섞는다.
 */
export function setupMixFor(preference: "pullback" | "breakout" | "both", gateLevel: number): SetupMix {
  if (gateLevel >= 2 || preference === "both") return FULL_MIX;
  return preference === "pullback"
    ? { pullback: 0.7, breakout: 0, none: 0.3 }
    : { pullback: 0, breakout: 0.7, none: 0.3 };
}

/**
 * 원하는 비율대로 셋업이 나오도록 seed를 고른다.
 * 차트 자체는 여전히 seed 하나로 결정되므로, 서버가 seed로 다시 만들어 검증하는 구조는 그대로다.
 */
export function pickSeedForMix(mix: SetupMix, random: () => number = Math.random): number {
  const roll = random();
  const target: SetupLabel =
    roll < mix.pullback ? "pullback" : roll < mix.pullback + mix.breakout ? "breakout" : "none";
  for (let i = 0; i < 1000; i++) {
    const seed = Math.floor(random() * 1_000_000_000);
    if (setupLabelForSeed(seed) === target) return seed;
  }
  return Math.floor(random() * 1_000_000_000);
}

/** BlindChart에 넘길 데이터: decisionIndex 이후 봉은 아예 포함하지 않는다 */
export function visibleCandles(scenario: Scenario, revealCount = 0): Candle[] {
  return scenario.candles.slice(0, scenario.decisionIndex + revealCount);
}
