import { describe, expect, it } from "vitest";
import {
  practiceHint,
  practicePassRevealed,
  practiceReplayLines,
  practiceShowOverlay,
  practiceTopText,
} from "./practice-ui";
import type { Plan, Rep } from "./types";

const plan: Plan = {
  setupChoice: "pullback",
  entryPrice: 70_000,
  stopPrice: 68_000,
  targetPrice: 74_000,
  targetR: 2,
};

function rep(overrides: Partial<Rep> = {}): Rep {
  return {
    id: "r1",
    scenarioId: "s1",
    seed: 1,
    setupLabel: "pullback",
    state: "WATCHING",
    openedAt: 0,
    ...overrides,
  };
}

describe("practiceTopText", () => {
  it("계획 작성 중이면 계획 안내", () => {
    expect(practiceTopText(rep(), true)).toBe("사기 전에 계획을 적으세요.");
  });
  it("재생 중이면 지켜보라는 안내", () => {
    expect(practiceTopText(rep({ state: "COMMITTED" }), false)).toBe("계획대로 진행되는지 지켜보세요.");
  });
  it("지나간 뒤 공개면 전용 문구", () => {
    expect(practiceTopText(rep({ state: "REVEALED", exitReason: "pass" }), false)).toBe(
      "지나간 뒤 이렇게 움직였습니다."
    );
  });
  it("그 외에는 기본 판단 안내", () => {
    expect(practiceTopText(rep(), false)).toBe("이 차트를 보고 판단하세요.");
  });
});

describe("practiceHint", () => {
  it("WATCHING + 폼 없음", () => {
    expect(practiceHint(rep(), false, false)).toContain("B 산다");
  });
  it("WATCHING + 폼 있음", () => {
    expect(practiceHint(rep(), true, false)).toContain("셋업 선택");
  });
  it("COMMITTED", () => {
    expect(practiceHint(rep({ state: "COMMITTED" }), false, false)).toContain("지금 판다");
  });
  it("EXECUTED 오버레이", () => {
    expect(practiceHint(rep({ state: "EXECUTED" }), false, true)).toContain("Y 예");
  });
  it("그 외 기본은 다음", () => {
    expect(practiceHint(rep({ state: "GRADED" }), false, true)).toBe("단축키: Enter 다음");
  });
});

describe("practiceReplayLines", () => {
  it("COMMITTED가 아니면 undefined", () => {
    expect(practiceReplayLines(rep())).toBeUndefined();
  });
  it("계획선 3개를 반환한다", () => {
    const lines = practiceReplayLines(rep({ state: "COMMITTED", plan }));
    expect(lines).toHaveLength(3);
    expect(lines?.map((l) => l.label)).toEqual(["목표", "진입", "손절"]);
  });
  it("손절가를 내렸으면 라벨이 바뀐다", () => {
    const lines = practiceReplayLines(rep({ state: "COMMITTED", plan, movedStopPrice: 67_000 }));
    expect(lines?.[2]).toMatchObject({ price: 67_000, label: "내린 손절" });
  });
});

describe("practiceShowOverlay / practicePassRevealed", () => {
  it("지나감은 오버레이를 띄우지 않는다", () => {
    expect(practiceShowOverlay(rep({ state: "REVEALED", exitReason: "pass" }))).toBe(false);
    expect(practicePassRevealed(rep({ state: "REVEALED", exitReason: "pass" }))).toBe(true);
  });
  it("EXECUTED/GRADED/REVEALED(지나감 제외)는 오버레이를 띄운다", () => {
    expect(practiceShowOverlay(rep({ state: "EXECUTED", exitReason: "stop" }))).toBe(true);
    expect(practiceShowOverlay(rep({ state: "GRADED", exitReason: "target" }))).toBe(true);
  });
  it("WATCHING/COMMITTED는 오버레이가 없다", () => {
    expect(practiceShowOverlay(rep())).toBe(false);
    expect(practiceShowOverlay(rep({ state: "COMMITTED" }))).toBe(false);
  });
});
