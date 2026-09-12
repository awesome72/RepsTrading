import { describe, expect, it } from "vitest";
import { createRng, gaussian, randInt, uniform } from "./rng";

describe("createRng", () => {
  it("같은 seed는 항상 같은 순서의 값을 낸다 — 시드 결정성의 근간", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("다른 seed는 다른 순서의 값을 낸다", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it("[0, 1) 범위의 값을 낸다", () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("uniform", () => {
  it("[min, max) 범위를 벗어나지 않는다", () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const v = uniform(rng, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it("같은 rng 시퀀스면 같은 결과를 낸다", () => {
    expect(uniform(createRng(5), 0, 100)).toBe(uniform(createRng(5), 0, 100));
  });
});

describe("randInt", () => {
  it("[min, max] 양끝을 포함한 정수만 낸다", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 1, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    // 충분히 많이 뽑으면 양끝(1, 5)도 실제로 나와야 한다 — off-by-one 검증
    expect(seen.has(1)).toBe(true);
    expect(seen.has(5)).toBe(true);
  });

  it("min === max면 항상 그 값이다", () => {
    const rng = createRng(9);
    expect(randInt(rng, 4, 4)).toBe(4);
  });
});

describe("gaussian", () => {
  it("같은 rng 시퀀스면 같은 결과를 낸다", () => {
    expect(gaussian(createRng(11))).toBe(gaussian(createRng(11)));
  });

  it("유한한 숫자를 낸다 (u1=0일 때 log(0) 발생을 막는 EPSILON 처리 확인)", () => {
    const rng = createRng(13);
    for (let i = 0; i < 200; i++) {
      expect(Number.isFinite(gaussian(rng))).toBe(true);
    }
  });
});
