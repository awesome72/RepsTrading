import { generateScenario, pickSeedForMix, setupMixFor, type Scenario } from "@/lib/market/scenario";
import { useAccountStore } from "@/lib/account/store";

/** 지금 단계와 온보딩에서 고른 셋업에 맞는 차트를 만든다 (1단계는 고른 셋업 + 셋업 없음만) */
export function newPracticeScenario(): Scenario {
  const { setupPreference, gateLevel } = useAccountStore.getState();
  return generateScenario(pickSeedForMix(setupMixFor(setupPreference, gateLevel)));
}

/** 브라우저가 한가할 때 다음 시나리오를 미리 만들어 연습 사이 대기를 없앤다 */
export function scheduleIdle(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(cb);
  } else {
    setTimeout(cb, 0);
  }
}
