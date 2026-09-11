"use client";

import { BlindChart, type ChartMarker, type ChartPriceLine } from "@/components/blind-chart";
import { Button } from "@/components/ui/button";
import { ImmediateFeedback } from "@/components/rep/immediate-feedback";
import { InfoDot } from "@/components/info-tooltip";
import { Term } from "@/components/term";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { getGradeOption } from "@/lib/rep/grade-options";
import {
  POST_EXIT_CANDLES,
  revealWindow,
  simulatePlan,
  type SimulatedOutcome,
} from "@/lib/rep/plan-outcome";
import { cn } from "@/lib/utils";
import type { Plan, Rep, SetupChoice } from "@/lib/rep/types";
import type { Scenario, SetupLabel } from "@/lib/market/scenario";

const SETUP_HINT: Record<SetupLabel, string> = {
  pullback: "오르던 주식이 몇 봉 쉬면서 20일선 근처까지 내려온 자리입니다.",
  breakout: "15봉 넘게 좁게 오르내리다가 그 윗부분을 뚫고 올라선 봉입니다.",
  none: "뚜렷한 추세도, 좁은 횡보 뒤의 돌파도 아닌 애매한 자리입니다. 이런 곳은 지나가는 것이 정답입니다.",
};

const CHOICE_NAME: Record<SetupChoice, string> = { pullback: "눌림목", breakout: "돌파", other: "기타" };

const PLANNED_EXIT_NAME = { stop: "손절가 도달", target: "목표가 도달", timeout: "시간 초과" } as const;

function SetupName({ label }: { label: SetupLabel }) {
  if (label === "pullback") return <Term id="nul-lim-mok">눌림목</Term>;
  if (label === "breakout") return <Term id="dol-pa">돌파</Term>;
  return <>셋업 없음</>;
}

function formatR(r: number): string {
  return `${r > 0 ? "+" : ""}${r.toFixed(1)}R`;
}

type RevealPanelProps = {
  rep: Rep & { result: NonNullable<Rep["result"]> };
  /** 청산 이후 차트와 정답 셋업을 보여주기 위한 이번 연습의 전체 시나리오 */
  scenario: Scenario;
  /** 방금 끝난 rep까지 포함된 전체 기록 (즉시 피드백 계산용) */
  logReps: Rep[];
  onNext: () => void;
  /** 온보딩 가이드 연습에서 이 화면의 의미를 짚어주는 말풍선 */
  coachMessage?: string;
  /** 가이드 연습은 통계에 반영되지 않으므로 "달라진 것" 카드를 보여주지 않는다 */
  hideImmediateFeedback?: boolean;
  nextLabel?: string;
};

export function RevealPanel({
  rep,
  scenario,
  logReps,
  onNext,
  coachMessage,
  hideImmediateFeedback,
  nextLabel = "다음 연습",
}: RevealPanelProps) {
  useHotkeys({ Enter: onNext });

  const coach = coachMessage && (
    <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
      {coachMessage}
    </div>
  );

  if (rep.exitReason === "pass") {
    const wasCorrect = rep.setupLabel === "none";
    return (
      <div className="flex flex-col gap-4">
        {coach}
        <div
          className={cn(
            "flex flex-col gap-1 rounded-lg border px-4 py-3 text-[13px] leading-relaxed text-foreground",
            wasCorrect ? "border-good/40 bg-good/10" : "border-border bg-card"
          )}
        >
          <p>
            {wasCorrect ? (
              "정답입니다 — 이 구간은 셋업이 아니었습니다. 지나간 것이 맞는 판단이었습니다."
            ) : (
              <>
                이 구간은 사실 <SetupName label={rep.setupLabel} /> 셋업이었습니다. 지나간 것도 훈련
                데이터가 됩니다.
              </>
            )}
          </p>
          {!wasCorrect && (
            <p className="text-[12px] text-muted-foreground">{SETUP_HINT[rep.setupLabel]}</p>
          )}
          <p className="text-[12px] text-muted-foreground">차트에 이후 움직임을 이어서 보여드립니다.</p>
        </div>
        <Button size="lg" className="h-12 w-full text-[15px] font-bold" onClick={onNext}>
          {nextLabel}
        </Button>
      </div>
    );
  }

  const r = rep.result.rMultiple;
  const goodJudgment = rep.decisionGrade === "A" || rep.decisionGrade === "B";
  const goodOutcome = r > 0;
  const lucky = !goodJudgment && goodOutcome;
  const graded = getGradeOption(rep.decisionGrade);
  // 계획을 벗어났을 때만(직접 청산·손절 내림): 계획을 그대로 뒀다면 어떻게 끝났을지
  const planned = rep.adhered === false && rep.plan ? simulatePlan(scenario, rep.plan) : null;

  return (
    <div className="flex flex-col gap-5">
      {coach}
      <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card py-6">
        <span className="text-[12px] text-muted-foreground">이번 판단의 결과</span>
        <span
          className={cn(
            "num text-[40px] font-bold leading-none",
            r > 0 ? "text-up" : r < 0 ? "text-down" : "text-foreground"
          )}
        >
          {formatR(r)}
        </span>
      </div>

      {rep.plan && <AfterExitChart rep={rep} plan={rep.plan} scenario={scenario} planned={planned} />}

      {rep.plan && <SetupAnswer label={rep.setupLabel} choice={rep.plan.setupChoice} />}

      {planned && <PlanComparison planned={planned} actualR={r} />}

      {graded && (
        <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 text-[13px]">
          <p className="font-semibold text-foreground">
            이번 채점: {graded.value} — {graded.label}
          </p>
          <p className="text-[12px] leading-snug text-muted-foreground">{graded.desc}</p>
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-[12px]">
        <div className="flex items-center gap-1 pb-1">
          <InfoDot content="좋은 판단 = A/B 등급(계획을 지킴), 나쁜 판단 = C/D 등급(계획을 어김). 결과(R)와는 별개로, 이 표는 '어겼는데 벌었는지·지켰는데 잃었는지'를 보여줍니다." />
        </div>
        <div className="py-1 text-muted-foreground">좋은 결과</div>
        <div className="py-1 text-muted-foreground">나쁜 결과</div>

        <div className="flex items-center justify-end pr-2 text-muted-foreground">좋은 판단</div>
        <MatrixCell active={goodJudgment && goodOutcome}>정상</MatrixCell>
        <MatrixCell active={goodJudgment && !goodOutcome}>정상</MatrixCell>

        <div className="flex items-center justify-end pr-2 text-muted-foreground">나쁜 판단</div>
        <MatrixCell active={lucky} warn>
          ⚠ 위험
        </MatrixCell>
        <MatrixCell active={!goodJudgment && !goodOutcome}>정상</MatrixCell>
      </div>

      {lucky && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
          이번엔 운이 좋았습니다. 이 방식을 반복하면 결국 잃습니다.
        </div>
      )}

      {!hideImmediateFeedback && <ImmediateFeedback logReps={logReps} />}

      <Button size="lg" className="h-12 w-full text-[15px] font-bold" onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

const PLANNED_MARKER: Record<SimulatedOutcome["exitReason"], Omit<ChartMarker, "time">> = {
  stop: { label: "계획상 손절", position: "belowBar", shape: "circle", tone: "down" },
  target: { label: "계획상 목표", position: "aboveBar", shape: "circle", tone: "up" },
  timeout: { label: "계획상 종료", position: "aboveBar", shape: "circle", tone: "neutral" },
};

function AfterExitChart({
  rep,
  plan,
  scenario,
  planned,
}: {
  rep: Rep;
  plan: Plan;
  scenario: Scenario;
  planned: SimulatedOutcome | null;
}) {
  const exitIndex = rep.exitIndex ?? scenario.decisionIndex;
  // 계획대로라면 끝났을 지점이 화면 밖으로 밀리지 않게 창을 넓힌다
  const lastIndex = Math.max(exitIndex, planned?.exitIndex ?? exitIndex);
  const candles = revealWindow(scenario, lastIndex);
  const shownAfterExit = Math.min(scenario.candles.length - 1, lastIndex + POST_EXIT_CANDLES) - exitIndex;
  const exitR = rep.result?.rMultiple ?? 0;

  const priceLines: ChartPriceLine[] = [
    { price: plan.targetPrice, label: "목표", tone: "up" },
    { price: plan.entryPrice, label: "진입", tone: "neutral" },
    { price: plan.stopPrice, label: "손절", tone: "down" },
  ];
  if (rep.movedStopPrice !== undefined) {
    priceLines.push({ price: rep.movedStopPrice, label: "내린 손절", tone: "down" });
  }
  const markers: ChartMarker[] = [
    {
      time: scenario.candles[scenario.decisionIndex - 1].time,
      label: "진입",
      position: "belowBar",
      shape: "arrowUp",
      tone: "neutral",
    },
    {
      time: scenario.candles[exitIndex].time,
      label: "청산",
      position: "aboveBar",
      shape: "arrowDown",
      tone: exitR > 0 ? "up" : exitR < 0 ? "down" : "neutral",
    },
  ];
  if (planned) {
    markers.push({ time: scenario.candles[planned.exitIndex].time, ...PLANNED_MARKER[planned.exitReason] });
    // 차트 라이브러리는 마커가 시간순이어야 한다 (계획상 청산이 실제 청산보다 앞설 수 있다)
    markers.sort((a, b) => a.time - b.time);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <BlindChart
        candles={candles}
        label="청산 이후까지"
        height={220}
        priceLines={priceLines}
        markers={markers}
      />
      <p className="text-[12px] leading-snug text-muted-foreground">
        청산 뒤 {shownAfterExit}봉까지 이어서 보여줍니다. 청산 이후의
        움직임은 참고일 뿐, 이번 판단의 잘잘못을 바꾸지 않습니다.
      </p>
    </div>
  );
}

function SetupAnswer({ label, choice }: { label: SetupLabel; choice: SetupChoice }) {
  const correct = label !== "none" && choice === label;
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-4 py-3 text-[13px] leading-relaxed text-foreground",
        correct ? "border-good/40 bg-good/10" : "border-border bg-card"
      )}
    >
      <p className="font-semibold">
        {label === "none" ? (
          "이 구간은 셋업이 아니었습니다 — 사지 않고 지나가는 것이 정답이었습니다."
        ) : correct ? (
          <>
            정답: <SetupName label={label} /> — 맞게 봤습니다.
          </>
        ) : (
          <>
            정답: <SetupName label={label} /> — 당신은 {CHOICE_NAME[choice]}(으)로 봤습니다.
          </>
        )}
      </p>
      <p className="text-[12px] text-muted-foreground">{SETUP_HINT[label]}</p>
    </div>
  );
}

/** 직접 청산했을 때만: 계획을 그대로 뒀다면 어떻게 끝났을지 나란히 보여준다 */
function PlanComparison({ planned, actualR }: { planned: SimulatedOutcome; actualR: number }) {
  const diff = planned.rMultiple - actualR;
  const note =
    Math.abs(diff) < 0.05
      ? "결과는 같았습니다. 그래도 계획을 중간에 바꾼 것은 기록에 남습니다."
      : diff > 0
        ? `계획을 바꾸는 바람에 ${diff.toFixed(1)}R을 손해 봤습니다.`
        : "이번엔 계획을 바꾼 것이 나았지만, 계획을 그때그때 바꾸는 습관은 길게 보면 손해입니다.";

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-3 text-[13px] text-foreground">
      <p className="text-[12px] text-muted-foreground">계획을 그대로 뒀다면</p>
      <div className="num flex flex-wrap gap-x-6 gap-y-1">
        <span>
          계획대로: {PLANNED_EXIT_NAME[planned.exitReason]} → {formatR(planned.rMultiple)}
        </span>
        <span>실제: {formatR(actualR)}</span>
      </div>
      <p className="text-[12px] leading-snug text-muted-foreground">{note}</p>
    </div>
  );
}

function MatrixCell({
  active,
  warn,
  children,
}: {
  active: boolean;
  warn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border py-2 text-[12px] font-medium",
        active
          ? warn
            ? "border-warn bg-warn/15 text-warn"
            : "border-border bg-surface-2 text-foreground"
          : "border-border/50 bg-transparent text-muted-foreground/50"
      )}
    >
      {children}
    </div>
  );
}
