import { describe, expect, it } from "vitest";
import { GRADE_OPTIONS, getGradeOption, gradeFromAnswers } from "./grade-options";

describe("getGradeOption", () => {
  it("등급에 맞는 옵션을 찾는다", () => {
    expect(getGradeOption("A")?.value).toBe("A");
    expect(getGradeOption("D")?.desc).toContain("손실 한도(1R)");
  });

  it("undefined면 찾지 못한다", () => {
    expect(getGradeOption(undefined)).toBeUndefined();
  });

  it("네 등급 모두 정의돼 있다", () => {
    expect(GRADE_OPTIONS.map((g) => g.value)).toEqual(["A", "B", "C", "D"]);
  });
});

describe("gradeFromAnswers", () => {
  it("둘 다 예면 A", () => {
    expect(gradeFromAnswers([true, true])).toBe("A");
  });

  it("하나라도 아니오면 B", () => {
    expect(gradeFromAnswers([true, false])).toBe("B");
    expect(gradeFromAnswers([false, true])).toBe("B");
    expect(gradeFromAnswers([false, false])).toBe("B");
  });

  it("빈 배열은 every가 true이므로 A (질문이 없을 때의 기본값)", () => {
    expect(gradeFromAnswers([])).toBe("A");
  });
});
