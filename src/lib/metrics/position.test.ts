import { describe, expect, it } from "vitest";
import { positionSize } from "./position";

describe("positionSize", () => {
  it("1R(계좌 × 위험 비율)을 1주당 손실로 나눠 수량을 정한다", () => {
    // 1,000만원 × 1% = 10만원, 1주당 1,700원 손실 → 58주 (58 × 1,700 = 98,600원)
    const p = positionSize({ accountSize: 10_000_000, riskPercent: 1, entryPrice: 56_000, stopPrice: 54_300 })!;
    expect(p.riskAmount).toBe(100_000);
    expect(p.shares).toBe(58);
    expect(p.lossAtStop).toBe(98_600);
    expect(p.cappedByAccount).toBe(false);
  });

  it("손절폭이 아주 좁으면 계좌 금액 한도로 수량을 자른다", () => {
    const p = positionSize({ accountSize: 1_000_000, riskPercent: 2, entryPrice: 50_000, stopPrice: 49_990 })!;
    expect(p.shares).toBe(20);
    expect(p.cappedByAccount).toBe(true);
  });

  it("손절가가 진입가 이상이거나 계좌 설정이 없으면 계산하지 않는다", () => {
    expect(positionSize({ accountSize: 10_000_000, riskPercent: 1, entryPrice: 100, stopPrice: 100 })).toBeNull();
    expect(positionSize({ accountSize: 0, riskPercent: 1, entryPrice: 100, stopPrice: 90 })).toBeNull();
  });
});
