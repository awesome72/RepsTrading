import { describe, expect, it } from "vitest";
import { serverRepToRep, type ServerRep } from "./api";
import { generateScenario } from "@/lib/market/scenario";

const SEED = 7;

function baseServerRep(overrides: Partial<ServerRep> = {}): ServerRep {
  return {
    id: "r1",
    user_id: "u1",
    setup_id: "pullback",
    scenario_seed: SEED,
    state: "REVEALED",
    committed_at: "2026-01-01T00:00:00.000Z",
    commit_hash: "hash",
    plan_setup: "pullback",
    plan_stop: 100,
    plan_target_r: 2,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("serverRepToRep", () => {
  it("setup_label/entry_price가 저장돼 있으면 그 값을 그대로 쓴다 (재생성하지 않는다)", () => {
    // scenario.ts가 실제로 계산하는 값과는 다른 값을 일부러 넣어, 캐시된 값이 우선한다는 걸 확인한다
    const rep = serverRepToRep(baseServerRep({ setup_label: "breakout", entry_price: 12345 }));
    expect(rep.setupLabel).toBe("breakout");
    expect(rep.plan?.entryPrice).toBe(12345);
  });

  it("setup_label/entry_price가 없으면(마이그레이션 이전 행) seed로 재생성한다", () => {
    const scenario = generateScenario(SEED);
    const expectedEntryPrice = scenario.candles[scenario.decisionIndex - 1].close;
    const rep = serverRepToRep(baseServerRep());
    expect(rep.setupLabel).toBe(scenario.setupLabel);
    expect(rep.plan?.entryPrice).toBe(expectedEntryPrice);
  });

  it("DB의 SQL NULL(null)도 undefined와 마찬가지로 재생성 경로를 탄다", () => {
    const scenario = generateScenario(SEED);
    const expectedEntryPrice = scenario.candles[scenario.decisionIndex - 1].close;
    const rep = serverRepToRep(
      baseServerRep({ setup_label: null as unknown as undefined, entry_price: null as unknown as undefined })
    );
    expect(rep.setupLabel).toBe(scenario.setupLabel);
    expect(rep.plan?.entryPrice).toBe(expectedEntryPrice);
  });

  it("채점 전 결과 필드가 없으면(응답에서 지워진 상태) result는 undefined다", () => {
    const rep = serverRepToRep(baseServerRep({ state: "COMMITTED", r_result: undefined }));
    expect(rep.result).toBeUndefined();
  });
});
