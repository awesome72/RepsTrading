import { describe, expect, it } from "vitest";
import { computeCommitHash, deriveEntryPrice, validateExit } from "./server-guard";
import { generateScenario } from "@/lib/market/scenario";

describe("computeCommitHash", () => {
  it("동일한 입력이면 항상 같은 해시를 낸다", () => {
    const params = {
      userId: "u1",
      scenarioSeed: 42,
      planSetup: "pullback",
      planStop: 90,
      planTargetR: 2,
      committedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(computeCommitHash(params)).toBe(computeCommitHash(params));
  });

  it("필드가 하나라도 다르면 다른 해시를 낸다", () => {
    const base = {
      userId: "u1",
      scenarioSeed: 42,
      planSetup: "pullback",
      planStop: 90,
      planTargetR: 2,
      committedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(computeCommitHash(base)).not.toBe(computeCommitHash({ ...base, planStop: 91 }));
  });
});

describe("deriveEntryPrice", () => {
  it("같은 seed는 항상 같은 진입가를 낸다 (결정적)", () => {
    expect(deriveEntryPrice(7)).toBe(deriveEntryPrice(7));
  });

  it("scenario.ts가 계산하는 진입가와 정확히 일치한다", () => {
    const scenario = generateScenario(7);
    const expected = scenario.candles[scenario.decisionIndex - 1].close;
    expect(deriveEntryPrice(7)).toBe(expected);
  });
});

describe("validateExit", () => {
  const seed = 123;
  const scenario = generateScenario(seed);
  const entryPrice = scenario.candles[scenario.decisionIndex - 1].close;
  const planStop = entryPrice * 0.97;
  const planTargetR = 2;

  it("지나간다(pass)는 청산가가 진입가와 같아야 유효하다", () => {
    const ok = validateExit({
      scenarioSeed: seed,
      planStop,
      planTargetR,
      exitReason: "pass",
      exitPrice: entryPrice,
      exitIndex: 0,
    });
    expect(ok.valid).toBe(true);

    const bad = validateExit({
      scenarioSeed: seed,
      planStop,
      planTargetR,
      exitReason: "pass",
      exitPrice: entryPrice * 1.5,
      exitIndex: 0,
    });
    expect(bad.valid).toBe(false);
  });

  it("조작된 청산가(실제 캔들과 무관한 값)는 거부한다", () => {
    const result = validateExit({
      scenarioSeed: seed,
      planStop,
      planTargetR,
      exitReason: "target",
      exitPrice: entryPrice * 100, // 말도 안 되는 값
      exitIndex: scenario.decisionIndex,
    });
    expect(result.valid).toBe(false);
  });

  it("범위를 벗어난 exit_index는 거부한다", () => {
    const result = validateExit({
      scenarioSeed: seed,
      planStop,
      planTargetR,
      exitReason: "manual",
      exitPrice: entryPrice,
      exitIndex: 999999,
    });
    expect(result.valid).toBe(false);
  });

  it("손절가를 내렸다면 원래 손절 아래 청산을 허용하되, 봉이 실제로 닿았어야 한다", () => {
    const idx = scenario.decisionIndex;
    const low = scenario.candles[idx].low;
    const base = { scenarioSeed: seed, planTargetR, exitReason: "stop" as const, exitIndex: idx, stopMoved: true };
    expect(validateExit({ ...base, planStop: low + 100, exitPrice: low + 50 }).valid).toBe(true);
    expect(validateExit({ ...base, planStop: low + 100, exitPrice: low - 500 }).valid).toBe(false);
    expect(validateExit({ ...base, stopMoved: false, planStop: low + 100, exitPrice: low + 50 }).valid).toBe(false);
  });

  it("manual/timeout은 해당 봉의 종가와 일치해야 유효하다", () => {
    const idx = scenario.decisionIndex;
    const candle = scenario.candles[idx];
    const ok = validateExit({
      scenarioSeed: seed,
      planStop,
      planTargetR,
      exitReason: "manual",
      exitPrice: candle.close,
      exitIndex: idx,
    });
    expect(ok.valid).toBe(true);
  });
});
