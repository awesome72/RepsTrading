import { describe, expect, it } from "vitest";
import { describeDecisionPace, typicalDecisionSeconds } from "./decision-time";
import type { Rep } from "@/lib/rep/types";

function rep(inputSeconds: number | undefined, pass = false, guided = false): Rep {
  return {
    id: `r-${Math.random()}`,
    scenarioId: "s",
    seed: 1,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: 0,
    inputSeconds,
    exitReason: pass ? "pass" : "target",
    guided,
  };
}

describe("typicalDecisionSeconds", () => {
  it("같은 종류의 중앙값을 낸다 (홀수·짝수)", () => {
    expect(typicalDecisionSeconds([rep(10), rep(30), rep(20)], "trade")).toBe(20);
    expect(typicalDecisionSeconds([rep(10), rep(20), rep(30), rep(40)], "trade")).toBe(25);
  });

  it("지나가기와 매매를 섞지 않는다", () => {
    const reps = [rep(3, true), rep(4, true), rep(5, true), rep(40), rep(50), rep(60)];
    expect(typicalDecisionSeconds(reps, "pass")).toBe(4);
    expect(typicalDecisionSeconds(reps, "trade")).toBe(50);
  });

  it("표본이 3개 미만이면 null, 가이드 연습·기록 없는 rep은 뺀다", () => {
    expect(typicalDecisionSeconds([rep(10), rep(20)], "trade")).toBeNull();
    expect(typicalDecisionSeconds([rep(10), rep(20), rep(30, false, true), rep(undefined)], "trade")).toBeNull();
  });
});

describe("describeDecisionPace", () => {
  it("평소가 없으면 시간만 말한다", () => {
    expect(describeDecisionPace(4, null, "pass")).toEqual({ tone: "normal", text: "지나가기까지 4초" });
  });

  it("절반보다 빠르면 fast, 두 배보다 느리면 slow, 그 사이는 normal", () => {
    expect(describeDecisionPace(10, 30, "trade").tone).toBe("fast");
    expect(describeDecisionPace(70, 30, "trade").tone).toBe("slow");
    expect(describeDecisionPace(30, 30, "trade").tone).toBe("normal");
  });

  it("1초 미만은 '0초'가 아니라 '1초 미만'으로 쓴다", () => {
    expect(describeDecisionPace(0.4, null, "pass").text).toBe("지나가기까지 1초 미만");
  });

  it("60초 이상은 분 단위로 쓴다", () => {
    expect(describeDecisionPace(95, 60, "trade").text).toContain("1분 35초");
    expect(describeDecisionPace(95, 60, "trade").text).toContain("평소 1분");
  });
});
