"use client";

import { useEffect, useRef, useState } from "react";
import { BlindChart, type BlindChartHandle } from "@/components/blind-chart";
import { EntryDecision } from "@/components/rep/entry-decision";
import { RepCardForm } from "@/components/rep/rep-card-form";
import { GradingScreen } from "@/components/rep/grading-screen";
import { RevealPanel } from "@/components/rep/reveal-panel";
import { Button } from "@/components/ui/button";
import { GateTransition } from "@/components/gate/gate-transition";
import { generateScenario, visibleCandles, type Scenario } from "@/lib/market/scenario";
import { useRepStore } from "@/lib/rep/store";
import { useRepLogStore } from "@/lib/rep/log-store";
import { useAccountStore } from "@/lib/account/store";
import { evaluateGate, checkDemotion } from "@/lib/gate/rules";
import type { GateLevel } from "@/lib/gate/types";
import { cn } from "@/lib/utils";
import type { DecisionGrade, Plan } from "@/lib/rep/types";

const SPEEDS = [1, 2, 4] as const;
const MAX_REPLAY_CANDLES = 30;

export default function PracticePage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  const chartRef = useRef<BlindChartHandle>(null);
  const revealCountRef = useRef(0);
  const exitedRef = useRef(false);

  const rep = useRepStore((s) => s.rep);
  const logReps = useRepLogStore((s) => s.reps);
  const [gateTransition, setGateTransition] = useState<{
    kind: "promotion" | "demotion";
    from: GateLevel;
    to: GateLevel;
  } | null>(null);

  useEffect(() => {
    useRepLogStore.getState().hydrate();
    useAccountStore.getState().hydrate();
    // 매번 랜덤이라 SSR과 절대 일치할 수 없다 — 마운트 후 클라이언트에서만 생성한다.
    const next = generateScenario();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScenario(next);
    useRepStore
      .getState()
      .startWatching({ scenarioId: next.id, seed: next.seed, setupLabel: next.setupLabel });
  }, []);

  // 계획 저장 후 재생: 봉을 하나씩 공개하며 손절/목표/시간초과를 감시한다
  useEffect(() => {
    if (!rep || rep.state !== "COMMITTED" || !scenario || !rep.plan) return;
    exitedRef.current = false;
    const plan = rep.plan;
    const intervalMs = 1000 / speed;

    const id = setInterval(() => {
      if (exitedRef.current) return;
      const prev = revealCountRef.current;
      const nextIndex = scenario.decisionIndex + prev;

      if (nextIndex >= scenario.candles.length) {
        exitedRef.current = true;
        const lastIdx = scenario.decisionIndex + prev - 1;
        useRepStore.getState().execute({
          exitPrice: scenario.candles[lastIdx].close,
          exitReason: "timeout",
          exitIndex: lastIdx,
          adhered: true,
        });
        return;
      }

      const candle = scenario.candles[nextIndex];
      chartRef.current?.advance([candle]);
      revealCountRef.current = prev + 1;
      setRevealCount(prev + 1);

      if (candle.low <= plan.stopPrice) {
        exitedRef.current = true;
        useRepStore.getState().execute({
          exitPrice: plan.stopPrice,
          exitReason: "stop",
          exitIndex: nextIndex,
          adhered: true,
        });
      } else if (candle.high >= plan.targetPrice) {
        exitedRef.current = true;
        useRepStore.getState().execute({
          exitPrice: plan.targetPrice,
          exitReason: "target",
          exitIndex: nextIndex,
          adhered: true,
        });
      } else if (prev + 1 >= MAX_REPLAY_CANDLES) {
        exitedRef.current = true;
        useRepStore.getState().execute({
          exitPrice: candle.close,
          exitReason: "timeout",
          exitIndex: nextIndex,
          adhered: true,
        });
      }
    }, intervalMs);

    return () => clearInterval(id);
    // rep 전체가 아니라 state/plan 변화에만 반응한다 — rep은 매 전이마다 참조가 바뀐다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep?.state, rep?.plan, scenario, speed]);

  if (!scenario || !rep) {
    return (
      <div className="flex flex-col gap-4 py-6">
        <div className="h-[420px] w-full rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const entryPrice = scenario.candles[scenario.decisionIndex - 1].close;

  function checkGateTransition() {
    const level = useAccountStore.getState().gateLevel;
    const updatedLog = useRepLogStore.getState().reps;

    if (level < 3) {
      const evaluation = evaluateGate(level, updatedLog);
      if (evaluation.passed) {
        const to = (level + 1) as GateLevel;
        useAccountStore.getState().promote();
        setGateTransition({ kind: "promotion", from: level, to });
        return;
      }
    }
    if (level > 1 && checkDemotion(updatedLog)) {
      const to = (level - 1) as GateLevel;
      useAccountStore.getState().demote();
      setGateTransition({ kind: "demotion", from: level, to });
    }
  }

  function handleEnter() {
    setShowForm(true);
  }

  function handlePass() {
    useRepStore.getState().pass(entryPrice);
    const revealed = useRepStore.getState().rep;
    if (revealed) {
      useRepLogStore.getState().addRep(revealed);
      checkGateTransition();
    }
  }

  function handleSavePlan(plan: Plan) {
    useRepStore.getState().commit(plan);
    setShowForm(false);
  }

  function handleManualExit() {
    if (!scenario) return;
    exitedRef.current = true;
    const idx = scenario.decisionIndex + revealCountRef.current - 1;
    const price = scenario.candles[idx]?.close ?? entryPrice;
    useRepStore.getState().execute({
      exitPrice: price,
      exitReason: "manual",
      exitIndex: idx,
      adhered: false,
    });
  }

  function handleGrade(grade: DecisionGrade) {
    useRepStore.getState().grade(grade);
    const revealed = useRepStore.getState().rep;
    if (revealed) {
      useRepLogStore.getState().addRep(revealed);
      checkGateTransition();
    }
  }

  function handleNext() {
    const next = generateScenario();
    revealCountRef.current = 0;
    exitedRef.current = false;
    setRevealCount(0);
    setShowForm(false);
    setScenario(next);
    useRepStore
      .getState()
      .startWatching({ scenarioId: next.id, seed: next.seed, setupLabel: next.setupLabel });
  }

  const showOverlay =
    rep.exitReason !== "pass" &&
    (rep.state === "EXECUTED" || rep.state === "GRADED" || rep.state === "REVEALED");

  const topText = showForm
    ? "사기 전에 계획을 적으세요."
    : rep.state === "COMMITTED"
      ? "계획대로 진행되는지 지켜보세요."
      : "이 차트를 보고 판단하세요.";

  return (
    <div className="flex flex-col gap-4 py-6">
      <p className="text-[14px] text-muted-foreground">{topText}</p>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="md:w-[70%]">
          <BlindChart
            ref={chartRef}
            candles={visibleCandles(scenario, revealCount)}
            label={`연습 #${scenario.seed.toString(16).slice(-4).toUpperCase()}`}
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 md:w-[30%]">
          {rep.state === "WATCHING" && !showForm && (
            <EntryDecision onEnter={handleEnter} onPass={handlePass} />
          )}

          {rep.state === "WATCHING" && showForm && (
            <RepCardForm entryPrice={entryPrice} onSave={handleSavePlan} />
          )}

          {rep.state === "COMMITTED" && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted-foreground">
                {revealCount}/{MAX_REPLAY_CANDLES}봉 진행 중
              </p>
              <div className="flex gap-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "h-7 flex-1 rounded-md border text-[12px] font-semibold",
                      speed === s
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {s}배속
                  </button>
                ))}
              </div>
              <Button variant="outline" className="h-11 w-full" onClick={handleManualExit}>
                지금 판다
              </Button>
            </div>
          )}

          {rep.exitReason === "pass" && rep.state === "REVEALED" && (
            <RevealPanel
              rep={rep as typeof rep & { result: NonNullable<typeof rep.result> }}
              logReps={logReps}
              onNext={handleNext}
            />
          )}
        </div>
      </div>

      {showOverlay && rep.state === "EXECUTED" && rep.plan && rep.exitReason && (
        <GradingScreen
          plan={rep.plan}
          exitReason={rep.exitReason}
          candles={scenario.candles.slice(
            Math.max(0, scenario.decisionIndex - 20),
            (rep.exitIndex ?? scenario.decisionIndex) + 1
          )}
          onGrade={handleGrade}
        />
      )}

      {showOverlay && (rep.state === "GRADED" || rep.state === "REVEALED") && rep.result && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
            <RevealPanel
              rep={rep as typeof rep & { result: NonNullable<typeof rep.result> }}
              logReps={logReps}
              onNext={handleNext}
            />
          </div>
        </div>
      )}

      {gateTransition && (
        <GateTransition
          kind={gateTransition.kind}
          fromLevel={gateTransition.from}
          toLevel={gateTransition.to}
          onClose={() => setGateTransition(null)}
        />
      )}
    </div>
  );
}
