import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTutorialProgress,
  estimateSceneMs,
  loadTutorialProgress,
  saveTutorialProgress,
} from "./playback";
import { TUTORIAL_SCENES } from "./scenes";

const KEY = "reps.tutorial.v1";

beforeEach(() => localStorage.clear());

describe("estimateSceneMs", () => {
  it("짧은 문장도 최소 4초는 머문다", () => {
    expect(estimateSceneMs("안녕하세요")).toBe(4000);
  });

  it("공백을 뺀 글자 수에 비례한다", () => {
    const a = estimateSceneMs("가".repeat(100));
    const b = estimateSceneMs("가 ".repeat(100));
    expect(a).toBe(b);
    expect(estimateSceneMs("가".repeat(200))).toBe(a * 2);
  });

  it("빠르게 재생하면 짧아진다", () => {
    const base = estimateSceneMs("가".repeat(100), 1);
    expect(estimateSceneMs("가".repeat(100), 1.2)).toBeLessThan(base);
    expect(estimateSceneMs("가".repeat(100), 0.9)).toBeGreaterThan(base);
  });

  it("실제 장면 자막은 모두 4초~40초 사이로 추정된다", () => {
    for (const s of TUTORIAL_SCENES) {
      const ms = estimateSceneMs(s.caption);
      expect(ms).toBeGreaterThanOrEqual(4000);
      expect(ms).toBeLessThanOrEqual(40000);
    }
  });
});

describe("이어보기 위치", () => {
  it("저장한 중간 장면을 돌려준다", () => {
    saveTutorialProgress(4);
    expect(loadTutorialProgress(11)).toBe(4);
  });

  it("첫 장면·마지막 장면은 이어볼 것이 없어 null", () => {
    saveTutorialProgress(0);
    expect(loadTutorialProgress(11)).toBeNull();
    saveTutorialProgress(10);
    expect(loadTutorialProgress(11)).toBeNull();
  });

  it("장면 수가 줄어 범위를 벗어나면 null", () => {
    saveTutorialProgress(9);
    expect(loadTutorialProgress(8)).toBeNull();
  });

  it("깨진 값이면 던지지 않고 null", () => {
    localStorage.setItem(KEY, "{broken");
    expect(loadTutorialProgress(11)).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ index: "3" }));
    expect(loadTutorialProgress(11)).toBeNull();
  });

  it("clear 후에는 null", () => {
    saveTutorialProgress(3);
    clearTutorialProgress();
    expect(loadTutorialProgress(11)).toBeNull();
  });

  it("저장이 막혀도 던지지 않는다", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveTutorialProgress(2)).not.toThrow();
    spy.mockRestore();
  });
});
