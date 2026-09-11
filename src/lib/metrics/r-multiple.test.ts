import { describe, expect, it } from "vitest";
import { rMultiple } from "./r-multiple";

describe("rMultiple", () => {
  it("목표가 도달 시 +2R을 계산한다", () => {
    // 70,000 매수, 68,000 손절(1R=2,000), 74,000 청산(+2R)
    expect(rMultiple(70_000, 74_000, 68_000)).toBeCloseTo(2);
  });

  it("손절가 도달 시 -1R을 계산한다", () => {
    expect(rMultiple(70_000, 68_000, 68_000)).toBeCloseTo(-1);
  });

  it("진입가와 손절가가 같으면 0을 반환한다 (0으로 나누기 방지)", () => {
    expect(rMultiple(70_000, 75_000, 70_000)).toBe(0);
  });

  it("진입가 그대로 청산하면 부동소수점 잔차 없이 정확히 0", () => {
    // 실제로 발생한 값: 진입 직후 청산했는데 8.6e-15R이 나와 "이익"으로 분류됐다
    const entry = 56366.814006641485;
    expect(rMultiple(entry, entry + 1e-11, 54676)).toBe(0);
    expect(Object.is(rMultiple(entry, entry - 1e-11, 54676), 0)).toBe(true);
  });

  it("숏 포지션은 부호가 반전된다", () => {
    expect(rMultiple(70_000, 66_000, 72_000, "short")).toBeCloseTo(2);
  });
});
