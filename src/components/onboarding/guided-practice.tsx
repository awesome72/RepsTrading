"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { BlindChartHandle } from "@/components/blind-chart";
import { Button } from "@/components/ui/button";
import { RepCardForm } from "@/components/rep/rep-card-form";
import { GradingScreen } from "@/components/rep/grading-screen";
import { RevealPanel } from "@/components/rep/reveal-panel";
import { generateScenario, visibleCandles, type Scenario } from "@/lib/market/scenario";
import { useRepStore } from "@/lib/rep/store";
import { checkPlanExit, MAX_REPLAY_CANDLES } from "@/lib/rep/plan-outcome";
import type { DecisionGrade, Plan } from "@/lib/rep/types";

const BlindChart = dynamic(() => import("@/components/blind-chart").then((m) => m.BlindChart), {
  ssr: false,
});

const GUIDE_REPLAY_MS = 350;

export function GuidedPractice({ onComplete }: { onComplete: () => void }) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [revealCount, setRevealCount] = useState(0);

  const chartRef = useRef<BlindChartHandle>(null);
  const revealCountRef = useRef(0);
  const exitedRef = useRef(false);

  const rep = useRepStore((s) => s.rep);

  useEffect(() => {
    const next = generateScenario();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScenario(next);
    useRepStore.getState().startWatching({
      scenarioId: next.id,
      seed: next.seed,
      setupLabel: next.setupLabel,
      guided: true,
    });
  }, []);

  useEffect(() => {
    if (!rep || rep.state !== "COMMITTED" || !scenario || !rep.plan) return;
    exitedRef.current = false;
    const plan = rep.plan;

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

      const hit = checkPlanExit(candle, plan);
      if (hit) {
        exitedRef.current = true;
        useRepStore.getState().execute({ ...hit, exitIndex: nextIndex, adhered: true });
      } else if (prev + 1 >= MAX_REPLAY_CANDLES) {
        exitedRef.current = true;
        useRepStore.getState().execute({
          exitPrice: candle.close,
          exitReason: "timeout",
          exitIndex: nextIndex,
          adhered: true,
        });
      }
    }, GUIDE_REPLAY_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep?.state, rep?.plan, scenario]);

  if (!scenario || !rep) {
    return <div className="h-[420px] w-full rounded-lg border border-border bg-card" />;
  }

  const entryPrice = scenario.candles[scenario.decisionIndex - 1].close;

  function handleSavePlan(plan: Plan) {
    useRepStore.getState().commit(plan);
    setShowForm(false);
  }

  function handleGrade(grade: DecisionGrade) {
    useRepStore.getState().grade(grade);
  }

  const showOverlay =
    rep.state === "EXECUTED" || rep.state === "GRADED" || rep.state === "REVEALED";

  const coach = showForm
    ? "③ 얼마까지 내려가면 틀린 건지 정하세요. 이게 손절가입니다."
    : rep.state === "WATCHING"
      ? "① 차트를 보세요. 오른쪽은 아직 가려져 있습니다. ② 여기서 살지 결정하세요."
      : "계획대로 진행되는지 지켜보세요.";

  return (
    <div className="flex flex-col gap-4">
      {!showOverlay && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
          {coach}
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="md:w-[70%]">
          <BlindChart
            ref={chartRef}
            candles={visibleCandles(scenario, revealCount)}
            label="가이드 연습"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 md:w-[30%]">
          {rep.state === "WATCHING" && !showForm && (
            <Button
              size="lg"
              className="h-14 w-full text-[15px] font-bold"
              onClick={() => setShowForm(true)}
            >
              여기서 산다
            </Button>
          )}

          {rep.state === "WATCHING" && showForm && (
            <RepCardForm entryPrice={entryPrice} onSave={handleSavePlan} />
          )}

          {rep.state === "COMMITTED" && (
            <p className="text-[13px] text-muted-foreground">
              {revealCount}/{MAX_REPLAY_CANDLES}봉 진행 중
            </p>
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
          coachMessage="④ 이제 결과를 보기 전에, 당신 판단을 먼저 채점합니다."
        />
      )}

      {showOverlay && (rep.state === "GRADED" || rep.state === "REVEALED") && rep.result && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
            <RevealPanel
              rep={rep as typeof rep & { result: NonNullable<typeof rep.result> }}
              scenario={scenario}
              logReps={[]}
              onNext={onComplete}
              coachMessage="⑤ 이제 결과입니다. 이 가이드 연습은 통계에 포함되지 않습니다."
              hideImmediateFeedback
              nextLabel="다음으로"
            />
          </div>
        </div>
      )}
    </div>
  );
}
