"use client";

import { Button } from "@/components/ui/button";
import { ImmediateFeedback } from "@/components/rep/immediate-feedback";
import { InfoDot } from "@/components/info-tooltip";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { getGradeOption } from "@/lib/rep/grade-options";
import { cn } from "@/lib/utils";
import type { Rep } from "@/lib/rep/types";
import type { SetupLabel } from "@/lib/market/scenario";

const SETUP_KOREAN: Record<SetupLabel, string> = {
  pullback: "눌림목",
  breakout: "돌파",
  none: "셋업 없음",
};

type RevealPanelProps = {
  rep: Rep & { result: NonNullable<Rep["result"]> };
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
  logReps,
  onNext,
  coachMessage,
  hideImmediateFeedback,
  nextLabel = "다음 연습",
}: RevealPanelProps) {
  useHotkeys({ Enter: onNext });

  if (rep.exitReason === "pass") {
    const wasCorrect = rep.setupLabel === "none";
    return (
      <div className="flex flex-col gap-4">
        {coachMessage && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
            {coachMessage}
          </div>
        )}
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-[13px] leading-relaxed",
            wasCorrect
              ? "border-good/40 bg-good/10 text-foreground"
              : "border-border bg-card text-foreground"
          )}
        >
          {wasCorrect
            ? "정답입니다 — 이 구간은 셋업이 아니었습니다. 지나간 것이 맞는 판단이었습니다."
            : `이 구간은 사실 ${SETUP_KOREAN[rep.setupLabel]} 셋업이었습니다. 지나간 것도 훈련 데이터가 됩니다.`}
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

  return (
    <div className="flex flex-col gap-5">
      {coachMessage && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
          {coachMessage}
        </div>
      )}
      <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card py-6">
        <span className="text-[12px] text-muted-foreground">이번 판단의 결과</span>
        <span
          className={cn(
            "num text-[40px] font-bold leading-none",
            r > 0 ? "text-up" : r < 0 ? "text-down" : "text-foreground"
          )}
        >
          {r > 0 ? "+" : ""}
          {r.toFixed(1)}R
        </span>
      </div>

      {(() => {
        const graded = getGradeOption(rep.decisionGrade);
        if (!graded) return null;
        return (
          <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 text-[13px]">
            <p className="font-semibold text-foreground">
              당신의 채점: {graded.value} — {graded.label}
            </p>
            <p className="text-[12px] leading-snug text-muted-foreground">{graded.desc}</p>
          </div>
        );
      })()}

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
