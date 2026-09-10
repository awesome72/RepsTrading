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

  it("숏 포지션은 부호가 반전된다", () => {
    expect(rMultiple(70_000, 66_000, 72_000, "short")).toBeCloseTo(2);
  });
});
