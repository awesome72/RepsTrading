import { describe, expect, it } from "vitest";
import {
  assertRevealable,
  canTransition,
  commitPlan,
  createRep,
  executeExit,
  gradeDecision,
  getResult,
  passRep,
  reveal,
} from "./machine";
import type { Plan } from "./types";

const plan: Plan = {
  setupChoice: "pullback",
  entryPrice: 70_000,
  stopPrice: 68_000,
  targetPrice: 74_000,
  targetR: 2,
};

function baseRep() {
  return createRep({
    scenarioId: "s1",
    seed: 1,
    setupLabel: "pullback",
    openedAt: 0,
  });
}

describe("canTransition", () => {
  it("정해진 순서만 허용한다", () => {
    expect(canTransition("WATCHING", "COMMITTED")).toBe(true);
    expect(canTransition("COMMITTED", "EXECUTED")).toBe(true);
    expect(canTransition("EXECUTED", "GRADED")).toBe(true);
    expect(canTransition("GRADED", "REVEALED")).toBe(true);
  });

  it("순서를 건너뛰는 전이는 허용하지 않는다", () => {
    expect(canTransition("WATCHING", "EXECUTED")).toBe(false);
    expect(canTransition("WATCHING", "GRADED")).toBe(false);
    expect(canTransition("WATCHING", "REVEALED")).toBe(false);
    expect(canTransition("COMMITTED", "REVEALED")).toBe(false);
  });

  it("역방향 전이는 허용하지 않는다", () => {
    expect(canTransition("COMMITTED", "WATCHING")).toBe(false);
    expect(canTransition("REVEALED", "GRADED")).toBe(false);
  });
});

describe("결과 잠금", () => {
  it("GRADED 미만 상태에서 result는 항상 undefined다", () => {
    const rep = baseRep();
    expect(rep.result).toBeUndefined();

    const committed = commitPlan(rep, plan, 5_000);
    expect(committed.result).toBeUndefined();

    const executed = executeExit(committed, {
      exitPrice: 74_000,
      exitReason: "target",
      exitIndex: 5,
      adhered: true,
    });
    expect(executed.result).toBeUndefined();
  });

  it("GRADED 이전에 assertRevealable/getResult를 호출하면 throw한다", () => {
    const rep = baseRep();
    expect(() => assertRevealable(rep)).toThrow();
    expect(() => getResult(rep)).toThrow();

    const committed = commitPlan(rep, plan, 5_000);
    expect(() => getResult(committed)).toThrow();

    const executed = executeExit(committed, {
      exitPrice: 74_000,
      exitReason: "target",
      exitIndex: 5,
      adhered: true,
    });
    expect(() => getResult(executed)).toThrow();
  });

  it("채점을 마치면 result가 즉시 계산되고 이후 REVEALED에서 읽을 수 있다", () => {
    const rep = baseRep();
    const committed = commitPlan(rep, plan, 5_000);
    const executed = executeExit(committed, {
      exitPrice: 74_000,
      exitReason: "target",
      exitIndex: 5,
      adhered: true,
    });
    const graded = gradeDecision(executed, "A");
    expect(graded.result).toBeDefined();
    expect(graded.result?.rMultiple).toBeCloseTo(2);

    const revealed = reveal(graded);
    expect(getResult(revealed).rMultiple).toBeCloseTo(2);
  });

  it("순서를 건너뛰어 채점하려 하면 throw한다", () => {
    const rep = baseRep();
    expect(() => gradeDecision(rep, "A")).toThrow();
    const committed = commitPlan(rep, plan, 5_000);
    expect(() => gradeDecision(committed, "A")).toThrow();
  });
});

describe("passRep (지나간다)", () => {
  it("한 번에 REVEALED까지 진행하고 R은 0이다", () => {
    const rep = baseRep();
    const passed = passRep(rep, { price: 50_000, now: 1_000 });
    expect(passed.state).toBe("REVEALED");
    expect(getResult(passed).rMultiple).toBe(0);
    expect(passed.exitReason).toBe("pass");
  });
});

describe("inputSeconds", () => {
  it("committedAt - openedAt을 초 단위로 기록한다", () => {
    const rep = createRep({
      scenarioId: "s1",
      seed: 1,
      setupLabel: "none",
      openedAt: 1_000,
    });
    const committed = commitPlan(rep, plan, 1_000 + 12_500);
    expect(committed.inputSeconds).toBeCloseTo(12.5);
  });
});
