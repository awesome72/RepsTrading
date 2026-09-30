"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { BlindChart } from "@/components/blind-chart";
import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { getGradeOption, gradeFromAnswers, JUDGMENT_QUESTIONS } from "@/lib/rep/grade-options";
import type { ExecutionVerdict } from "@/lib/rep/plan-outcome";
import type { Candle } from "@/lib/market/generator";
import type { DecisionGrade, ExitReason, Plan } from "@/lib/rep/types";
import { cn } from "@/lib/utils";

const SETUP_LABEL: Record<Plan["setupChoice"], string> = {
  pullback: "눌림목",
  breakout: "돌파",
  other: "기타",
};

const EXIT_LABEL: Record<ExitReason, string> = {
  stop: "손절가에 닿아 청산됐습니다.",
  target: "목표가에 도달해 청산됐습니다.",
  manual: "직접 청산했습니다.",
  timeout: "손절도 목표도 닿지 않아 시간 초과로 청산됐습니다.",
  pass: "포지션을 잡지 않았습니다.",
};

const VERDICT_TEXT: Record<ExecutionVerdict["kind"], string> = {
  followed: "계획대로 실행했습니다. 정해둔 손절·목표·시간 규칙으로 청산됐습니다.",
  "early-exit": "계획보다 먼저 직접 팔았습니다. 계획을 벗어난 실행이라 C로 기록됩니다.",
  "stop-ignored": "손절가를 내리거나 넘겨서 버텼습니다. 손실 한도를 지키지 않은 실행이라 D로 기록됩니다.",
};

function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

type GradingScreenProps = {
  plan: Plan;
  exitReason: ExitReason;
  /** 계획을 지켰는지 — 실행 기록으로 시스템이 판정한 값 */
  verdict: ExecutionVerdict;
  movedStopPrice?: number;
  candles: Candle[];
  onGrade: (grade: DecisionGrade) => void | Promise<unknown>;
  /** 채점 저장 실패 메시지 — 전체 화면을 덮는 채점 화면 안에서 보여줘야 사용자가 볼 수 있다 */
  error?: string | null;
  /** 온보딩 가이드 연습에서 이 화면의 의미를 짚어주는 말풍선 */
  coachMessage?: string;
};

export function GradingScreen({
  plan,
  exitReason,
  verdict,
  movedStopPrice,
  candles,
  onGrade,
  error,
  coachMessage,
}: GradingScreenProps) {
  const followed = verdict.kind === "followed";
  const [answers, setAnswers] = useState<(boolean | null)[]>(JUDGMENT_QUESTIONS.map(() => null));
  const complete = answers.every((a) => a !== null);
  const grade: DecisionGrade = followed
    ? complete
      ? gradeFromAnswers(answers as boolean[])
      : "A"
    : verdict.bestGrade;
  const [submitted, setSubmitted] = useState(false);
  const ready = (!followed || complete) && !submitted;

  function answer(value: boolean, index = answers.findIndex((a) => a === null)) {
    if (index < 0 || submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function submit() {
    if (!ready) return;
    setSubmitted(true);
    // 성공하면 이 화면은 사라지고, 실패하면 다시 누를 수 있게 풀어준다
    Promise.resolve(onGrade(grade)).finally(() => setSubmitted(false));
  }

  useHotkeys({
    y: () => followed && answer(true),
    n: () => followed && answer(false),
    Enter: submit,
  });

  const preview = getGradeOption(grade);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        {coachMessage && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
            {coachMessage}
          </div>
        )}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="eyebrow text-primary">채점</span>
          <h1 className="text-[26px] font-bold leading-snug tracking-[-0.02em] text-foreground">
            결과를 보기 전에, 당신의 판단부터 채점합니다.
          </h1>
          <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
            돈을 벌었는지 먼저 보면, 사람은 반드시 &ldquo;벌었으니 잘한 거지&rdquo;라고
            채점합니다. 그래서 순서를 바꿉니다.
          </p>
        </div>

        <BlindChart candles={candles} label="이번 판단" hidePriceLabels height={220} />

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <dl className="grid grid-cols-3 gap-3 text-[13px]">
            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground">셋업</dt>
              <dd className="font-semibold text-foreground">{SETUP_LABEL[plan.setupChoice]}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground">손절</dt>
              <dd className="num text-down">
                {won(plan.stopPrice)}
                {movedStopPrice !== undefined && (
                  <span className="block text-[11px] text-warn">→ {won(movedStopPrice)} (재생 중 내림)</span>
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground">목표</dt>
              <dd className="num text-up">
                {won(plan.targetPrice)} <span className="text-muted-foreground">({Number(plan.targetR.toFixed(2))}R)</span>
              </dd>
            </div>
          </dl>
          <p className="border-t border-border pt-3 text-[12px] text-muted-foreground">{EXIT_LABEL[exitReason]}</p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="flex items-baseline gap-2 text-[13px] font-semibold text-foreground">
            <span className="num text-[11px] font-medium text-primary">01</span> 실행 <span className="font-normal text-muted-foreground">· 기록으로 판정</span>
          </h2>
          <p
            className={cn(
              "rounded-xl border px-4 py-3 text-[13px] leading-relaxed text-foreground",
              followed ? "border-good/40 bg-good/10" : "border-warn/40 bg-warn/10"
            )}
          >
            {VERDICT_TEXT[verdict.kind]}
          </p>
        </section>

        {followed && (
          <section className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-2 text-[13px] font-semibold text-foreground">
              <span className="num text-[11px] font-medium text-primary">02</span> 판단 <span className="font-normal text-muted-foreground">· 스스로 점검</span>
            </h2>
            {JUDGMENT_QUESTIONS.map((q, i) => (
              <div key={q.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5">
                <p className="text-[14px] font-semibold text-foreground">{q.question}</p>
                <p className="text-[12px] leading-snug text-muted-foreground">{q.help}</p>
                <div className="flex gap-2">
                  {([true, false] as const).map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      aria-pressed={answers[i] === value}
                      onClick={() => answer(value, i)}
                      className={cn(
                        "h-10 flex-1 rounded-lg border text-[13px] font-semibold transition-colors",
                        answers[i] === value
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary"
                      )}
                    >
                      {value ? "예" : "아니오"}
                      <span className="ml-1.5 text-[11px] font-normal opacity-50">{value ? "Y" : "N"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 결과 화면의 첫 카드와 같은 모양 — 왼쪽 등급은 지금 정해지고, 오른쪽 결과는 채점해야 열린다.
            결과 값은 여기에 절대 넣지 않는다(자리표시 "?"만) */}
        <div className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[1.1fr_1fr]">
          <div className="flex items-center gap-4 border-b border-border p-5 sm:border-b-0 sm:border-r">
            <span
              className={cn(
                "num flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-[28px] font-bold",
                (!followed || complete) && preview
                  ? grade === "A" || grade === "B"
                    ? "text-good"
                    : "text-warn"
                  : "text-muted-foreground/40"
              )}
            >
              {(!followed || complete) && preview ? preview.value : "–"}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="eyebrow text-muted-foreground">이번 채점</span>
              <p className="text-[14px] font-semibold leading-snug text-foreground">
                {(!followed || complete) && preview ? preview.label : "두 질문에 답하면 정해집니다"}
              </p>
            </div>
          </div>
          <div className="hatch relative flex flex-col items-center justify-center gap-2 px-5 py-6">
            <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background">
              <Lock size={15} className="text-primary" />
            </span>
            <span className="num select-none text-[28px] font-bold leading-none text-muted-foreground/60 blur-[2px]">
              ?.?R
            </span>
            <span className="text-[12px] text-muted-foreground">채점하면 열립니다</span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            {error}
          </p>
        )}

        <Button size="lg" className="h-12 w-full text-[15px] font-bold" disabled={!ready} onClick={submit}>
          {followed ? "채점하고 결과 보기" : "확인하고 결과 보기"}
          <span className="ml-1.5 text-[11px] opacity-60">Enter</span>
        </Button>
      </div>
    </div>
  );
}
