import seedrandom from "seedrandom";

export type Rng = () => number;

export function createRng(seed: number): Rng {
  return seedrandom(String(seed));
}

/** 표준정규분포 표본 (Box-Muller) */
export function gaussian(rng: Rng): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** [min, max) 범위의 균등분포 표본 */
export function uniform(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** 정수 [min, max] (양끝 포함) */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(uniform(rng, min, max + 1));
}
