import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { BlindChartHandle } from "@/components/blind-chart";
import type { Scenario } from "@/lib/market/scenario";
import { checkPlanExit, MAX_REPLAY_CANDLES } from "@/lib/rep/plan-outcome";
import type { ExitReason, Plan } from "@/lib/rep/types";

export type ReplayExit = { exitPrice: number; exitReason: ExitReason; exitIndex: number };

type UseReplayLoopParams = {
  /** COMMITTED 상태일 때만 true — practice와 guided-practice 둘 다 이 조건으로 재생을 시작한다 */
  active: boolean;
  scenario: Scenario | null;
  plan: Plan | null;
  intervalMs: number;
  chartRef: RefObject<BlindChartHandle | null>;
  /** 재생 중 손절가를 내렸을 때(practice 전용) 매 봉 최신 값을 읽으려면 넘긴다. 안 넘기면 plan.stopPrice 그대로 쓴다 */
  getStopPrice?: () => number;
  /** 봉이 하나 더 보일 때마다 호출된다(세션 저장 등 부가 효과용) */
  onAdvance?: (revealCount: number) => void;
  onExit: (exit: ReplayExit) => void;
};

/**
 * 계획 저장 후 재생: 봉을 하나씩 공개하며 손절/목표/시간초과를 감시한다.
 * practice/page.tsx와 onboarding/guided-practice.tsx가 거의 같은 루프를 각자 들고 있던 것을 하나로 모았다 —
 * 둘 다 새 필드(예: 진동, candles prop)가 생길 때마다 같은 수정을 두 번 하게 만들던 원인이었다.
 */
export function useReplayLoop({
  active,
  scenario,
  plan,
  intervalMs,
  chartRef,
  getStopPrice,
  onAdvance,
  onExit,
}: UseReplayLoopParams) {
  const [revealCount, setRevealCount] = useState(0);
  const revealCountRef = useRef(0);
  const exitedRef = useRef(false);

  useEffect(() => {
    if (!active || !scenario || !plan) return;
    exitedRef.current = false;

    const id = setInterval(() => {
      if (exitedRef.current) return;
      const prev = revealCountRef.current;
      const nextIndex = scenario.decisionIndex + prev;

      if (nextIndex >= scenario.candles.length) {
        exitedRef.current = true;
        const lastIdx = scenario.decisionIndex + prev - 1;
        onExit({ exitPrice: scenario.candles[lastIdx].close, exitReason: "timeout", exitIndex: lastIdx });
        return;
      }

      const candle = scenario.candles[nextIndex];
      chartRef.current?.advance([candle]);
      revealCountRef.current = prev + 1;
      setRevealCount(prev + 1);
      onAdvance?.(prev + 1);

      const stopPrice = getStopPrice ? getStopPrice() : plan.stopPrice;
      const hit = checkPlanExit(candle, { ...plan, stopPrice });
      if (hit) {
        exitedRef.current = true;
        // 모바일에서 손절·목표 도달 순간을 짧은 진동으로 알린다 — 지원 안 하는 환경은 조용히 무시
        navigator.vibrate?.(80);
        onExit({ ...hit, exitIndex: nextIndex });
      } else if (prev + 1 >= MAX_REPLAY_CANDLES) {
        exitedRef.current = true;
        onExit({ exitPrice: candle.close, exitReason: "timeout", exitIndex: nextIndex });
      }
    }, intervalMs);

    return () => clearInterval(id);
    // scenario/plan 전체가 아니라 참조 변화에만 반응한다 — getStopPrice/onAdvance/onExit는 매 렌더 새로
    // 만들어지는 클로저라 deps에 넣으면 재생 도중 인터벌이 계속 재시작된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, scenario, plan, intervalMs]);

  /** 새로고침 복구용 — 저장된 진행 지점부터 이어서 재생한다. deps 배열에 안전하게 넣을 수 있도록 참조를 고정한다 */
  const restore = useCallback((n: number) => {
    revealCountRef.current = n;
    setRevealCount(n);
  }, []);

  /** 다음 연습으로 넘어갈 때 처음 상태로 되돌린다 */
  const reset = useCallback(() => {
    restore(0);
    exitedRef.current = false;
  }, [restore]);

  return { revealCount, revealCountRef, exitedRef, restore, reset };
}
