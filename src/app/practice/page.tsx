"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { BlindChartHandle } from "@/components/blind-chart";
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
import type { GateTransition as GateTransitionData } from "@/lib/gate/rules";
import { apiEvaluateGate } from "@/lib/account/api";
import { useUser } from "@/lib/auth/use-user";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import {
  apiCommitRep,
  apiExecuteRep,
  apiGradeRep,
  apiPassRep,
  apiRevealRep,
  serverRepToRep,
} from "@/lib/rep/api";
import { cn } from "@/lib/utils";
import type { DecisionGrade, ExitReason, Plan, Rep } from "@/lib/rep/types";

const BlindChart = dynamic(() => import("@/components/blind-chart").then((m) => m.BlindChart), {
  ssr: false,
});

const SPEEDS = [1, 2, 4] as const;
const MAX_REPLAY_CANDLES = 30;
const SESSION_KEY = "reps.activeSession.v1";

type PersistedSession = {
  scenarioSeed: number;
  repId: string | null;
  revealCount: number;
  rep: Rep;
};

/** 재생 중(COMMITTED/EXECUTED) 새로고침해도 이어서 볼 수 있도록 세션에 남긴다 */
function persistSession(scenario: Scenario | null, repId: string | null, revealCount: number) {
  const rep = useRepStore.getState().rep;
  try {
    if (!scenario || !rep || rep.state === "WATCHING" || rep.state === "REVEALED") {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    const payload: PersistedSession = { scenarioSeed: scenario.seed, repId, revealCount, rep };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage 접근 불가 — 복구 기능만 못 쓸 뿐, 연습 자체는 계속된다
  }
}

/** 브라우저가 한가할 때 다음 시나리오를 미리 만들어 연습 사이 대기를 없앤다 */
function scheduleIdle(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(cb);
  } else {
    setTimeout(cb, 0);
  }
}

function tryRestoreSession(): { scenario: Scenario; repId: string | null; revealCount: number; rep: Rep } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    // 채점까지 끝난 rep은 복구 대상이 아니다 (다음 연습으로 넘어가면 그만이다)
    const resumable = parsed.rep && (parsed.rep.state === "COMMITTED" || parsed.rep.state === "EXECUTED");
    if (!resumable) return null;
    const scenario = generateScenario(parsed.scenarioSeed);
    return { scenario, repId: parsed.repId, revealCount: parsed.revealCount, rep: parsed.rep };
  } catch {
    return null;
  }
}

export default function PracticePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chartRef = useRef<BlindChartHandle>(null);
  const revealCountRef = useRef(0);
  const exitedRef = useRef(false);
  const repIdRef = useRef<string | null>(null);
  const nextScenarioRef = useRef<Scenario | null>(null);

  const rep = useRepStore((s) => s.rep);
  const logReps = useRepLogStore((s) => s.reps);
  const logStatus = useRepLogStore((s) => s.status);
  const [gateTransition, setGateTransition] = useState<GateTransitionData | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const restored = tryRestoreSession();
    if (restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScenario(restored.scenario);
      repIdRef.current = restored.repId;
      revealCountRef.current = restored.revealCount;
      setRevealCount(restored.revealCount);
      useRepStore.setState({ rep: restored.rep });
      return;
    }

    // 매번 랜덤이라 SSR과 절대 일치할 수 없다 — 마운트 후 클라이언트에서만 생성한다.
    const next = generateScenario();
    setScenario(next);
    useRepStore
      .getState()
      .startWatching({ scenarioId: next.id, seed: next.seed, setupLabel: next.setupLabel });
  }, [user]);

  // 계획 저장 후 재생: 봉을 하나씩 공개하며 손절/목표/시간초과를 감시한다
  useEffect(() => {
    if (!rep || rep.state !== "COMMITTED" || !scenario || !rep.plan) return;
    exitedRef.current = false;
    const plan = rep.plan;
    const intervalMs = 1000 / speed;

    async function finishExit(params: {
      exitPrice: number;
      exitReason: ExitReason;
      exitIndex: number;
      adhered: boolean;
    }) {
      if (!repIdRef.current) return;
      try {
        await apiExecuteRep(repIdRef.current, params);
        useRepStore.getState().execute(params);
        persistSession(scenario, repIdRef.current, revealCountRef.current);
      } catch (e) {
        setApiError(
          e instanceof Error
            ? `청산 처리에 실패했습니다: ${e.message} — 새로고침 후 다시 시도해주세요.`
            : "청산 처리에 실패했습니다."
        );
      }
    }

    const id = setInterval(() => {
      if (exitedRef.current) return;
      const prev = revealCountRef.current;
      const nextIndex = scenario.decisionIndex + prev;

      if (nextIndex >= scenario.candles.length) {
        exitedRef.current = true;
        const lastIdx = scenario.decisionIndex + prev - 1;
        finishExit({
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
      persistSession(scenario, repIdRef.current, prev + 1);

      if (candle.low <= plan.stopPrice) {
        exitedRef.current = true;
        finishExit({
          exitPrice: plan.stopPrice,
          exitReason: "stop",
          exitIndex: nextIndex,
          adhered: true,
        });
      } else if (candle.high >= plan.targetPrice) {
        exitedRef.current = true;
        finishExit({
          exitPrice: plan.targetPrice,
          exitReason: "target",
          exitIndex: nextIndex,
          adhered: true,
        });
      } else if (prev + 1 >= MAX_REPLAY_CANDLES) {
        exitedRef.current = true;
        finishExit({
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

  // 채점/결과 확인 중 여유 시간에 다음 연습 시나리오를 미리 만들어둔다
  useEffect(() => {
    if (!rep) return;
    if (
      (rep.state === "EXECUTED" || rep.state === "GRADED" || rep.state === "REVEALED") &&
      !nextScenarioRef.current
    ) {
      scheduleIdle(() => {
        nextScenarioRef.current = generateScenario();
      });
    }
    // rep 전체가 아니라 state 변화에만 반응한다 — rep은 매 전이마다 참조가 바뀐다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep?.state]);

  const entryPrice = scenario ? scenario.candles[scenario.decisionIndex - 1].close : 0;

  /** 승급·강등은 서버가 서버 기록으로 판정한다 — 기기마다 단계가 달라지지 않는다 */
  async function checkGateTransition() {
    try {
      const { gateLevel, transition } = await apiEvaluateGate();
      useAccountStore.getState().setGateLevel(gateLevel);
      if (transition) setGateTransition(transition);
    } catch {
      // 판정 실패는 연습을 막지 않는다 — 다음 연습이 끝날 때 다시 판정된다
    }
  }

  function handleEnter() {
    setShowForm(true);
  }

  async function handlePass() {
    if (!scenario || !rep) return;
    const inputSeconds = (Date.now() - rep.openedAt) / 1000;
    // "지나간다"는 R이 항상 0이라 잠글 결과가 없다 — 화면은 즉시 넘기고 저장은 뒤에서 한다.
    useRepStore.getState().pass(entryPrice);
    const revealed = useRepStore.getState().rep;
    if (!revealed) return;
    useRepLogStore.getState().addRep(revealed);

    try {
      const saved = await apiPassRep({ scenarioSeed: scenario.seed, inputSeconds });
      useRepLogStore.getState().replaceRep(revealed.id, serverRepToRep(saved));
      checkGateTransition();
    } catch (e) {
      useRepLogStore.getState().removeRep(revealed.id);
      setApiError(
        e instanceof Error
          ? `지나간 기록을 저장하지 못했습니다: ${e.message}`
          : "지나간 기록을 저장하지 못했습니다."
      );
    }
  }

  async function handleSavePlan(plan: Plan) {
    if (!scenario || !rep) return;
    setApiError(null);
    setSaving(true);
    try {
      const inputSeconds = (Date.now() - rep.openedAt) / 1000;
      const created = await apiCommitRep({
        scenarioSeed: scenario.seed,
        planSetup: plan.setupChoice,
        planStop: plan.stopPrice,
        planTargetR: plan.targetR,
        inputSeconds,
      });
      repIdRef.current = created.id;
      useRepStore.getState().commit(plan);
      persistSession(scenario, created.id, 0);
      setShowForm(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "계획 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualExit() {
    if (!scenario || !repIdRef.current) return;
    exitedRef.current = true;
    const idx = scenario.decisionIndex + revealCountRef.current - 1;
    const price = scenario.candles[idx]?.close ?? entryPrice;
    try {
      await apiExecuteRep(repIdRef.current, {
        exitPrice: price,
        exitReason: "manual",
        exitIndex: idx,
        adhered: false,
      });
      useRepStore.getState().execute({
        exitPrice: price,
        exitReason: "manual",
        exitIndex: idx,
        adhered: false,
      });
      persistSession(scenario, repIdRef.current, revealCountRef.current);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "청산 처리에 실패했습니다.");
    }
  }

  async function handleGrade(grade: DecisionGrade) {
    const repId = repIdRef.current;
    if (!repId) return;
    setApiError(null);
    try {
      const graded = await apiGradeRep(repId, grade);
      await apiRevealRep(repId);

      useRepStore.getState().grade(grade);
      // 화면에 보이는 R은 서버가 계산한 값을 그대로 쓴다 (클라이언트 재계산에 의존하지 않는다).
      useRepStore.setState((s) =>
        s.rep && s.rep.result
          ? { rep: { ...s.rep, result: { ...s.rep.result, rMultiple: graded.r_result } } }
          : s
      );

      const revealed = useRepStore.getState().rep;
      if (revealed) {
        useRepLogStore.getState().addRep({ ...revealed, id: repId });
        checkGateTransition();
      }
      // 채점이 끝났으니 새로고침 복구 대상에서 제외한다
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "채점 처리에 실패했습니다.");
    }
  }

  function handleNext() {
    const next = nextScenarioRef.current ?? generateScenario();
    nextScenarioRef.current = null;
    repIdRef.current = null;
    revealCountRef.current = 0;
    exitedRef.current = false;
    setApiError(null);
    setRevealCount(0);
    setShowForm(false);
    setScenario(next);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    useRepStore
      .getState()
      .startWatching({ scenarioId: next.id, seed: next.seed, setupLabel: next.setupLabel });
  }

  useHotkeys({ " ": rep?.state === "COMMITTED" ? handleManualExit : () => {} });

  if (logStatus === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-[13px] text-muted-foreground">
        <p>연습 기록을 불러오지 못했습니다. 네트워크 연결을 확인해주세요.</p>
        <Button variant="outline" onClick={() => useRepLogStore.getState().refresh()}>
          다시 시도
        </Button>
      </div>
    );
  }

  // 기록을 받기 전에 연습을 시작하면 즉시 피드백의 "이전 → 이후" 숫자가 틀리게 나온다
  if (userLoading || !user || !scenario || !rep || logStatus !== "ready") {
    return (
      <div className="flex flex-col gap-4 py-6">
        <div className="h-[420px] w-full rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const showOverlay =
    rep.exitReason !== "pass" &&
    (rep.state === "EXECUTED" || rep.state === "GRADED" || rep.state === "REVEALED");

  const topText = showForm
    ? "사기 전에 계획을 적으세요."
    : rep.state === "COMMITTED"
      ? "계획대로 진행되는지 지켜보세요."
      : "이 차트를 보고 판단하세요.";

  const hint =
    rep.state === "WATCHING" && !showForm
      ? "단축키: B 산다 · S 지나간다"
      : rep.state === "WATCHING" && showForm
        ? "단축키: 1/2/3 셋업 선택 · Enter 저장"
        : rep.state === "COMMITTED"
          ? "단축키: Space 지금 판다"
          : showOverlay && rep.state === "EXECUTED"
            ? "단축키: A/B/C/D 채점"
            : "단축키: Enter 다음";

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-muted-foreground">{topText}</p>
        <p className="hidden text-[11px] text-muted-foreground/70 sm:block">{hint}</p>
      </div>

      {apiError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {apiError}
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="md:w-[70%]">
          <BlindChart
            ref={chartRef}
            candles={visibleCandles(scenario, revealCount)}
            label={`연습 #${scenario.seed.toString(16).slice(-4).toUpperCase()}`}
          />
        </div>

        <div className="sticky bottom-24 z-10 rounded-lg border border-border bg-card p-4 md:static md:bottom-auto md:w-[30%]">
          {rep.state === "WATCHING" && !showForm && (
            <EntryDecision onEnter={handleEnter} onPass={handlePass} />
          )}

          {rep.state === "WATCHING" && showForm && (
            <RepCardForm entryPrice={entryPrice} onSave={handleSavePlan} saving={saving} />
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
                지금 판다 <span className="ml-1.5 text-[11px] opacity-60">Space</span>
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
