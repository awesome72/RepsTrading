import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReplayLoop } from "./use-replay-loop";
import type { Scenario } from "@/lib/market/scenario";
import type { Plan } from "@/lib/rep/types";
import type { Candle } from "@/lib/market/generator";

function candle(i: number, close: number, low = close, high = close): Candle {
  return { time: i, open: close, high, low, close, volume: 100 };
}

const PLAN: Plan = { setupChoice: "pullback", entryPrice: 100, stopPrice: 90, targetPrice: 120, targetR: 2 };

function makeScenario(closes: number[], decisionIndex = 2): Scenario {
  return {
    id: "s",
    seed: 1,
    decisionIndex,
    setupLabel: "pullback",
    regime: "uptrend" as Scenario["regime"],
    candles: closes.map((c, i) => candle(i, c)),
  };
}

const chartRef = { current: { advance: vi.fn(), zoomToRange: vi.fn() } } as never;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", { vibrate: vi.fn() });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useReplayLoop", () => {
  it("active가 false면 아무것도 하지 않는다", () => {
    const onExit = vi.fn();
    const scenario = makeScenario([100, 100, 101, 102, 103]);
    renderHook(() => useReplayLoop({ active: false, scenario, plan: PLAN, intervalMs: 100, chartRef, onExit }));
    act(() => vi.advanceTimersByTime(1000));
    expect(onExit).not.toHaveBeenCalled();
  });

  it("매 틱마다 revealCount를 늘리고 onAdvance를 부른다", () => {
    const onExit = vi.fn();
    const onAdvance = vi.fn();
    const scenario = makeScenario([100, 100, 101, 102, 103, 104, 105]);
    const { result } = renderHook(() =>
      useReplayLoop({ active: true, scenario, plan: PLAN, intervalMs: 100, chartRef, onAdvance, onExit })
    );
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.revealCount).toBe(1);
    expect(onAdvance).toHaveBeenCalledWith(1);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.revealCount).toBe(2);
  });

  it("손절가에 닿으면 stop으로 onExit하고 진동한다", () => {
    const onExit = vi.fn();
    // decisionIndex=2 → 재생은 index 2부터. index 2의 low(85)가 손절가(90) 아래.
    const scenario = makeScenario([100, 100], 2);
    scenario.candles.push(candle(2, 88, 85, 90));
    const { result } = renderHook(() =>
      useReplayLoop({ active: true, scenario, plan: PLAN, intervalMs: 100, chartRef, onExit })
    );
    act(() => vi.advanceTimersByTime(100));
    expect(onExit).toHaveBeenCalledWith({ exitPrice: 90, exitReason: "stop", exitIndex: 2 });
    expect(navigator.vibrate).toHaveBeenCalledWith(80);
    expect(result.current.exitedRef.current).toBe(true);
  });

  it("getStopPrice가 있으면 plan.stopPrice 대신 그 값을 매 틱 다시 읽는다", () => {
    const onExit = vi.fn();
    const scenario = makeScenario([100, 100], 2);
    // low(97)는 원래 손절가(90) 아래가 아니지만, 옮긴 손절가(98)보다는 아래다
    scenario.candles.push(candle(2, 98, 97, 100));
    const getStopPrice = () => 98;
    renderHook(() =>
      useReplayLoop({ active: true, scenario, plan: PLAN, intervalMs: 100, chartRef, getStopPrice, onExit })
    );
    act(() => vi.advanceTimersByTime(100));
    expect(onExit).toHaveBeenCalledWith({ exitPrice: 98, exitReason: "stop", exitIndex: 2 });
  });

  it("MAX_REPLAY_CANDLES에 도달하면 timeout으로 onExit한다", () => {
    const onExit = vi.fn();
    // 30틱 넘게 손절/목표에 안 닿는 평평한 캔들을 충분히 만든다
    const closes = Array.from({ length: 40 }, () => 100);
    const scenario = makeScenario(closes, 2);
    renderHook(() =>
      useReplayLoop({ active: true, scenario, plan: PLAN, intervalMs: 10, chartRef, onExit })
    );
    act(() => vi.advanceTimersByTime(10 * 31));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit.mock.calls[0][0].exitReason).toBe("timeout");
  });

  it("시나리오 캔들이 바닥나면 마지막 봉 종가로 timeout onExit한다", () => {
    const onExit = vi.fn();
    const scenario = makeScenario([100, 100, 101, 102], 2); // decisionIndex=2, 캔들 4개 → 재생 가능한 건 index 2,3뿐
    renderHook(() =>
      useReplayLoop({ active: true, scenario, plan: PLAN, intervalMs: 10, chartRef, onExit })
    );
    act(() => vi.advanceTimersByTime(10 * 3));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit.mock.calls[0][0]).toEqual({ exitPrice: 102, exitReason: "timeout", exitIndex: 3 });
  });

  it("restore는 지정한 지점부터 이어서 재생하게 한다", () => {
    const onExit = vi.fn();
    const scenario = makeScenario([100, 100, 101, 102, 103, 104], 2);
    const { result } = renderHook(() =>
      useReplayLoop({ active: true, scenario, plan: PLAN, intervalMs: 100, chartRef, onExit })
    );
    act(() => result.current.restore(2));
    expect(result.current.revealCount).toBe(2);
    expect(result.current.revealCountRef.current).toBe(2);
  });

  it("reset은 처음 상태로 되돌린다", () => {
    const onExit = vi.fn();
    const scenario = makeScenario([100, 100, 101, 102, 103, 104], 2);
    const { result } = renderHook(() =>
      useReplayLoop({ active: true, scenario, plan: PLAN, intervalMs: 100, chartRef, onExit })
    );
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.revealCount).toBe(1);
    act(() => result.current.reset());
    expect(result.current.revealCount).toBe(0);
    expect(result.current.exitedRef.current).toBe(false);
  });
});
