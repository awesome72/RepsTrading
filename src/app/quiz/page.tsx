"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/term";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { useCompactViewport } from "@/lib/hooks/use-compact-viewport";
import { generateScenario, visibleCandles, type SetupLabel } from "@/lib/market/scenario";
import { SETUP_HINT, SETUP_NAME } from "@/lib/market/setup-copy";
import { gradeQuizAnswer, nextQuizSeed, type QuizAnswer } from "@/lib/quiz/quiz";
import { loadQuizLog, missedSeeds, recordQuizAnswer, todayQuizScore, type QuizLogEntry } from "@/lib/quiz/quiz-log";
import { cn } from "@/lib/utils";

const BlindChart = dynamic(() => import("@/components/blind-chart").then((m) => m.BlindChart), {
  ssr: false,
});

/** 정답 뒤에 이어서 보여줄 봉 수 — "그래서 어떻게 됐나"까지 봐야 모양이 눈에 남는다 */
const AFTER_CANDLES = 20;

/** 모바일 하단에 항상 떠 있는 면책 문구 + 탭바가 가리는 높이 */
const FIXED_BOTTOM_BARS = 140;

const CHOICES: { value: SetupLabel; key: string; term?: string }[] = [
  { value: "pullback", key: "1", term: "nul-lim-mok" },
  { value: "breakout", key: "2", term: "dol-pa" },
  { value: "none", key: "3" },
];

/**
 * 셋업 판별만 빠르게 반복하는 연습. 사고 파는 과정 없이 "이 차트가 무슨 모양인가"만 묻고
 * 곧바로 정답을 보여준다 — 2단계(판별)에서 필요한 눈을 짧은 주기로 훈련한다.
 * 서버에는 아무것도 남기지 않으므로(게이트·통계에 안 섞임), 오늘 점수·오답 목록은
 * 이 브라우저의 localStorage에만 쌓인다.
 */
export default function QuizPage() {
  const [seed, setSeed] = useState<number | null>(null);
  const [answer, setAnswer] = useState<QuizAnswer | null>(null);
  const [log, setLog] = useState<QuizLogEntry[] | null>(null);
  // 오답 복습 중에는 지금 문제가 review 큐의 몇 번째 seed인지 들고 있는다
  const [reviewSeed, setReviewSeed] = useState<number | null>(null);
  // 모바일에서는 차트를 줄이고 선택지를 가로로 놓아, 스크롤 없이 차트와 선택지가 한 화면에 들어오게 한다
  const compact = useCompactViewport();

  // 모바일에서는 정답 설명과 "다음 문제"가 하단 고정 바(면책 문구 + 탭바)에 가려진다.
  // scrollIntoView는 그 바를 모르고 "이미 보인다"고 판단하므로, 가려지는 만큼 직접 스크롤한다.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!answer || !compact) return;
    const panel = panelRef.current;
    if (!panel) return;
    const hidden = panel.getBoundingClientRect().bottom - (window.innerHeight - FIXED_BOTTOM_BARS);
    if (hidden > 0) window.scrollBy({ top: hidden, behavior: "smooth" });
  }, [answer, compact]);

  // 매번 랜덤이라 SSR과 일치할 수 없다 — 마운트 후 클라이언트에서만 만든다
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLog(loadQuizLog());
    setSeed(nextQuizSeed());
  }, []);

  const scenario = useMemo(() => (seed === null ? null : generateScenario(seed)), [seed]);
  const missed = useMemo(() => (log === null ? [] : missedSeeds(log)), [log]);
  const reviewing = reviewSeed !== null;

  function choose(choice: SetupLabel) {
    if (seed === null || answer || log === null) return;
    const graded = gradeQuizAnswer(seed, choice);
    setAnswer(graded);
    setLog(recordQuizAnswer(log, graded));
  }

  function next() {
    setAnswer(null);
    if (reviewing) {
      const remaining = missedSeeds(log ?? []).filter((s) => s !== reviewSeed);
      if (remaining.length === 0) {
        setReviewSeed(null);
        setSeed(nextQuizSeed());
        return;
      }
      const nextReview = remaining[0];
      setReviewSeed(nextReview);
      setSeed(nextReview);
      return;
    }
    setSeed(nextQuizSeed());
  }

  function startReview() {
    if (missed.length === 0) return;
    setAnswer(null);
    setReviewSeed(missed[0]);
    setSeed(missed[0]);
  }

  function stopReview() {
    setAnswer(null);
    setReviewSeed(null);
    setSeed(nextQuizSeed());
  }

  useHotkeys({
    "1": () => choose("pullback"),
    "2": () => choose("breakout"),
    "3": () => choose("none"),
    Enter: () => answer && next(),
  });

  const score = log === null ? null : todayQuizScore(log);

  if (!scenario || score === null) {
    return (
      <div className="flex flex-col gap-4 py-6">
        <div className="h-[420px] w-full rounded-lg border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">판별 퀴즈</h1>
          <p className="text-[12px] text-muted-foreground">
            사고파는 것 없이 모양만 맞혀봅니다. 이 기록은 통계·게이트에 들어가지 않습니다.
          </p>
        </div>
        {score.total > 0 && (
          <p className="num shrink-0 text-[13px] text-muted-foreground">
            오늘{" "}
            <span className="font-semibold text-foreground">
              {score.correct}/{score.total}
            </span>{" "}
            · {Math.round(score.accuracy * 100)}%
          </p>
        )}
      </div>

      {reviewing ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-[12px]">
          <span className="text-foreground">
            오답 복습 중 · 남은 {missedSeeds(log ?? []).length}문제
          </span>
          <button type="button" onClick={stopReview} className="font-semibold text-primary hover:underline">
            그만하기
          </button>
        </div>
      ) : (
        missed.length > 0 && (
          <button
            type="button"
            onClick={startReview}
            className="self-start rounded-md border border-dashed border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:border-primary hover:text-foreground"
          >
            오답 복습 ({missed.length}문제)
          </button>
        )
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="md:w-[70%]">
          <BlindChart
            candles={visibleCandles(scenario, answer ? AFTER_CANDLES : 0)}
            label={`문제 #${scenario.seed.toString(16).slice(-4).toUpperCase()}`}
            height={compact ? 300 : 420}
            // 뒤 봉을 이어 보여줄 때 어디까지가 문제였는지 표시해준다
            markers={
              answer
                ? [
                    {
                      time: scenario.candles[scenario.decisionIndex - 1].time,
                      label: "판단 지점",
                      position: "aboveBar",
                      shape: "circle",
                      tone: "neutral",
                    },
                  ]
                : undefined
            }
          />
          {answer && (
            <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
              판단 지점 이후 {AFTER_CANDLES}봉까지 이어서 보여줍니다.
            </p>
          )}
        </div>

        <div ref={panelRef} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:w-[30%]">
          <p className="text-[13px] font-semibold text-foreground">이 차트는 어떤 모양인가요?</p>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
            {CHOICES.map((c) => {
              const picked = answer?.choice === c.value;
              const isAnswer = answer?.label === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  disabled={!!answer}
                  onClick={() => choose(c.value)}
                  className={cn(
                    "flex h-11 items-center justify-between rounded-md border px-3 text-[14px] font-semibold transition-colors",
                    answer
                      ? isAnswer
                        ? "border-good bg-good/15 text-foreground"
                        : picked
                          ? "border-warn bg-warn/15 text-foreground"
                          : "border-border bg-card text-muted-foreground"
                      : "border-border bg-card text-foreground hover:border-primary"
                  )}
                >
                  <span>{SETUP_NAME[c.value]}</span>
                  <span className="text-[11px] font-normal opacity-60">{c.key}</span>
                </button>
              );
            })}
          </div>

          {answer ? (
            <>
              <div
                className={cn(
                  "flex flex-col gap-1 rounded-md border px-3 py-2 text-[13px] leading-relaxed",
                  answer.correct ? "border-good/40 bg-good/10" : "border-warn/40 bg-warn/10"
                )}
              >
                <p className="font-semibold text-foreground">
                  {answer.correct ? "정답입니다" : `정답은 ${SETUP_NAME[answer.label]}입니다`}
                </p>
                <p className="text-[12px] text-muted-foreground">{SETUP_HINT[answer.label]}</p>
              </div>
              <Button className="h-11 w-full text-[14px] font-bold" onClick={next}>
                다음 문제 <span className="ml-1.5 text-[11px] font-normal opacity-60">Enter</span>
              </Button>
            </>
          ) : (
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              <Term id="nul-lim-mok">눌림목</Term>과 <Term id="dol-pa">돌파</Term>가 아니면 셋업
              없음입니다. 단축키: 1 · 2 · 3
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
