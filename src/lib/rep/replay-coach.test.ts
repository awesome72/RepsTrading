import { describe, expect, it } from "vitest";
import { replayStatus } from "./replay-coach";
import type { Plan } from "./types";

// 진입 100, 손절 90 → 1R = 10. 목표 2R = 120
const plan: Plan = { setupChoice: "pullback", entryPrice: 100, stopPrice: 90, targetPrice: 120, targetR: 2 };

describe("replayStatus", () => {
  it("진입가에서는 0R, 손절까지 1R, 목표까지 2R", () => {
    const s = replayStatus({ plan, currentPrice: 100, peakPrice: 100 });
    expect(s.currentR).toBe(0);
    expect(s.toStopR).toBe(1);
    expect(s.toTargetR).toBe(2);
    expect(s.position).toBeCloseTo(1 / 3);
    expect(s.tone).toBe("neutral");
    expect(s.message).toBeNull();
  });

  it("손절선 근처면 위험 톤과 손절을 그대로 두라는 문구", () => {
    const s = replayStatus({ plan, currentPrice: 92, peakPrice: 100 });
    expect(s.tone).toBe("danger");
    expect(s.message).toContain("손절가를 그대로 두세요");
  });

  it("목표 근처면 끝까지 믿으라는 문구", () => {
    const s = replayStatus({ plan, currentPrice: 118, peakPrice: 118 });
    expect(s.message).toContain("목표가 코앞");
  });

  it("1R 이상 벌었다가 0.5R 이상 되돌리면 C로 기록된다고 짚는다", () => {
    const s = replayStatus({ plan, currentPrice: 104, peakPrice: 112 });
    expect(s.message).toContain("C");
  });

  it("1R 이상 수익 중이면 기다리는 연습이라고 알려준다", () => {
    const s = replayStatus({ plan, currentPrice: 110, peakPrice: 110 });
    expect(s.tone).toBe("profit");
    expect(s.message).toContain("기다리는 연습");
  });

  it("손절을 내렸다면 내린 선 기준으로 거리를 재고, 유혹 문구는 붙이지 않는다", () => {
    const s = replayStatus({ plan, movedStopPrice: 80, currentPrice: 92, peakPrice: 100 });
    expect(s.toStopR).toBeCloseTo(1.2);
    expect(s.message).toBeNull();
  });

  it("위치는 0~1 사이로 잘린다", () => {
    expect(replayStatus({ plan, currentPrice: 130, peakPrice: 130 }).position).toBe(1);
    expect(replayStatus({ plan, currentPrice: 85, peakPrice: 100 }).position).toBe(0);
  });
});
