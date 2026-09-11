import { describe, expect, it } from "vitest";
import { generateScenario } from "@/lib/market/scenario";
import { commitPlan, createRep, executeExit, gradeDecision, passRep, reveal } from "./machine";
import { toMigrationRow } from "./migration";
import { simulatePlan } from "./plan-outcome";
import type { DecisionGrade, ExitReason, Plan, Rep } from "./types";

const SEED = 4242;
const USER = "user-1";
const scenario = generateScenario(SEED);
const entry = scenario.candles[scenario.decisionIndex - 1].close;
const stop = entry * 0.97;
const plan: Plan = {
  setupChoice: "pullback",
  entryPrice: entry,
  stopPrice: stop,
  targetPrice: entry + 2 * (entry - stop),
  targetR: 2,
};

function started(): Rep {
  return createRep({ scenarioId: String(SEED), seed: SEED, setupLabel: scenario.setupLabel, openedAt: 1_000 });
}

function tradedRep(
  exit: { exitReason: ExitReason; exitIndex: number; exitPrice: number },
  grade: DecisionGrade
): Rep {
  const committed = commitPlan(started(), plan, 5_000);
  const executed = executeExit(committed, { ...exit, adhered: true });
  return reveal(gradeDecision(executed, grade));
}

describe("toMigrationRow", () => {
  it("계획대로 끝난 기록은 그대로 옮기되, R은 서버가 다시 계산한다 (조작된 결과는 무시)", () => {
    const planned = simulatePlan(scenario, plan);
    const rep = tradedRep(planned, "A");
    const tampered: Rep = { ...rep, result: { exitPrice: planned.exitPrice, rMultiple: 99 } };
    const row = toMigrationRow(tampered, USER)!;
    expect(row).not.toBeNull();
    expect(row.decision_grade).toBe("A");
    expect(row.adhered).toBe(true);
    expect(row.r_result).toBe(planned.rMultiple);
  });

  it("직접 청산한 기록을 A로 올리면 기록이 허락하는 최고 등급 C로 내린다", () => {
    const idx = scenario.decisionIndex;
    const rep = tradedRep({ exitReason: "manual", exitIndex: idx, exitPrice: scenario.candles[idx].close }, "A");
    const row = toMigrationRow(rep, USER)!;
    expect(row.decision_grade).toBe("C");
    expect(row.adhered).toBe(false);
  });

  it("실제 캔들과 맞지 않는 청산가는 옮기지 않는다", () => {
    const idx = scenario.decisionIndex;
    const rep = tradedRep({ exitReason: "manual", exitIndex: idx, exitPrice: entry * 3 }, "C");
    expect(toMigrationRow(rep, USER)).toBeNull();
  });

  it("지나간 기록은 /api/reps/pass와 같은 모양으로 옮긴다", () => {
    const rep = passRep(started(), { price: entry, now: 5_000 });
    const row = toMigrationRow(rep, USER)!;
    expect(row).toMatchObject({ exit_reason: "pass", plan_setup: "other", plan_target_r: 0, r_result: 0, decision_grade: "A" });
    expect(row.plan_stop).toBe(entry);
  });

  it("온보딩 가이드 연습과 채점 전 기록은 옮기지 않는다", () => {
    const guided: Rep = { ...passRep(started(), { price: entry, now: 5_000 }), guided: true };
    expect(toMigrationRow(guided, USER)).toBeNull();
    expect(toMigrationRow(commitPlan(started(), plan, 5_000), USER)).toBeNull();
  });
});
