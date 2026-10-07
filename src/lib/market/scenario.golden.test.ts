import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import { generateScenario, setupLabelForSeed } from "./scenario";

/**
 * 시드 결정성 골든 테스트 — 이 앱의 핵심 불변식을 지킨다.
 *
 * 서버는 저장된 scenario_seed로 차트를 다시 만들어 진입가·R·채점을 검증한다. 그래서 생성기(generator.ts),
 * 시나리오 조립(scenario.ts), 난수 소비 순서(rng.ts)가 한 비트라도 달라지면 저장된 모든 연습의
 * 재계산 결과가 조용히 바뀐다. "같은 시드면 같은 결과"만 확인하는 scenario.test.ts로는 이걸 못 잡는다
 * (코드가 바뀐 뒤에도 자기 자신과는 항상 같으므로) — 여기서는 지금까지의 실제 출력을 값으로 고정한다.
 *
 * 이 테스트가 깨졌다면: 생성기를 바꾼 것이다. 그건 데이터 마이그레이션이다.
 *  - 의도한 변경이 아니면 되돌린다.
 *  - 의도한 변경이면 **오너 승인**을 받고, 기존 rep(reps.scenario_seed)을 어떻게 다룰지(옛 버전 유지·재계산 허용)
 *    먼저 정한 뒤에 아래 값을 갱신한다. 값만 고쳐서 통과시키지 말 것.
 *
 * 시드는 십진 문자열이 같은 패턴의 반복("11", "4242", "99999")이 아닌 것만 골랐다. seedrandom이 시드를
 * 문자열 열쇠로 쓰기 때문에 그런 시드는 앞부분과 같은 차트가 나온다(예: 1과 11). 실제 시드는 0~10억 무작위라
 * 사실상 문제없지만, 겹치는 시드를 골든에 넣으면 검사 범위가 줄어든다.
 */

/** [시드, 정답 셋업, 판단 직전 종가(=진입가), 180봉 전체 해시(앞 16자)] */
const GOLDEN: [number, string, number, string][] = [
  [0, "none", 37068.36798140068, "ad29f9f5e4606f48"],
  [1, "pullback", 45197.65620158579, "6c320bdf09f0b53e"],
  [2, "none", 43744.16564389577, "9f2f38eb80566de3"],
  [3, "none", 30976.508037599964, "bea2cddecdf02dfc"],
  [5, "pullback", 46828.977166912526, "8ff0805860093095"],
  [7, "pullback", 43374.059890076256, "7a242b0b097f776a"],
  [13, "none", 51027.192596605455, "101b767ed5a3120d"],
  [17, "breakout", 41226.71924559468, "81b0e0b0059616a3"],
  [21, "pullback", 51649.3734100859, "0469b14d74b8d07a"],
  [30, "pullback", 60058.56685237132, "9380fede0926a640"],
  [42, "pullback", 37622.17116713054, "a022bf6f6225a753"],
  [99, "pullback", 58980.982548224354, "7af144b58e0303de"],
  [123, "none", 41709.816203561655, "85b07a1fff1f7966"],
  [456, "breakout", 50124.09887421738, "c491b51324e66ae9"],
  [1000, "pullback", 54874.60621849911, "334810795f1df8c2"],
  [2024, "none", 54478.11026011992, "53f0427b43298267"],
  [4243, "pullback", 58338.37885028923, "a14fb29acccd3617"],
  [7778, "pullback", 60245.36559895785, "23b0900095357fbe"],
  [31337, "breakout", 48162.311836986555, "6712b667122c6160"],
  [65535, "pullback", 63616.65325006337, "1799f92df69f8f88"],
  [99998, "pullback", 55345.39729586347, "1bb4ff1192ff5c06"],
  [123456, "breakout", 54399.00130110269, "f6ffa2b383336bae"],
  [314159, "pullback", 49736.82961714134, "d8bc8c1591b55888"],
  [999998, "none", 51836.739340647655, "243e634950b077b7"],
  [123456789, "pullback", 38721.956019600606, "7f802f1d5c542b25"],
  [271828182, "breakout", 68705.4294476579, "7ef90476c5aa1754"],
  [602214076, "breakout", 65824.02278795808, "70dcb4d137c37448"],
  [987654321, "pullback", 53585.01867587888, "0626c05b35dd5c91"],
];

function hashCandles(candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[]) {
  return createHash("sha256")
    .update(JSON.stringify(candles.map((c) => [c.time, c.open, c.high, c.low, c.close, c.volume])))
    .digest("hex")
    .slice(0, 16);
}

describe("시나리오 골든 값", () => {
  it.each(GOLDEN)("seed %i → %s, 진입가 %f", (seed, label, entry, hash) => {
    const s = generateScenario(seed);
    expect(s.setupLabel).toBe(label);
    expect(s.candles[s.decisionIndex - 1].close).toBe(entry);
    expect(hashCandles(s.candles)).toBe(hash);
  });

  it("골든 시드들이 서로 다른 차트를 낸다 (겹치면 검사 범위가 줄어든다)", () => {
    expect(new Set(GOLDEN.map((g) => g[3])).size).toBe(GOLDEN.length);
  });
});

describe("난수 소비 순서", () => {
  /** generateScenario의 첫 난수가 셋업 종류를 정한다 — setupLabelForSeed가 이 값을 그대로 쓰므로 순서가 바뀌면 둘이 어긋난다 */
  it("setupLabelForSeed는 generateScenario의 정답과 항상 같다", () => {
    for (let seed = 0; seed < 300; seed++) {
      expect(setupLabelForSeed(seed), `seed ${seed}`).toBe(generateScenario(seed).setupLabel);
    }
  });

  it("seed 0~99의 정답 셋업 순서가 고정이다 (P 눌림목 · B 돌파 · N 없음)", () => {
    const letters = { pullback: "P", breakout: "B", none: "N" } as const;
    const labels = Array.from({ length: 100 }, (_, i) => letters[setupLabelForSeed(i)]).join("");
    expect(labels).toBe("NPNNBPBPBPNPPNBPPBPBNPNPPBNBNBPBNNPBPBNPNNPBBBPNNBPBBNPPPBPNPBNPPNBBNBNPBBBPPPNPNPNBBPBBBPBNBNBBPNPP");
  });

  it("seed 42의 난수열 앞 5개가 고정이다", () => {
    const r = createRng(42);
    expect([r(), r(), r(), r(), r()]).toEqual([
      0.00701751618236155, 0.17185490054868188, 0.967001069269818, 0.4077816952668805, 0.922687842759339,
    ]);
  });
});
