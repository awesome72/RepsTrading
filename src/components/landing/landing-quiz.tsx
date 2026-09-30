"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { DECISION_INDEX, generateScenario, type SetupLabel } from "@/lib/market/scenario";
import { smaSeries } from "@/lib/market/indicators";
import { SETUP_HINT, SETUP_NAME } from "@/lib/market/setup-copy";
import { cn } from "@/lib/utils";
import { CandleSvg, priceRange } from "./candle-svg";

/**
 * 랜딩의 "30초 판별 체험" — 가입·온보딩 전에 이 서비스의 핵심(가려진 차트를 보고 판단 → 바로 확인)을
 * 한 번 맛보게 한다. 기록은 어디에도 남기지 않는다(판별 퀴즈 로그·통계와 무관).
 * SSR과 결과가 같도록 시드는 무작위가 아니라 고른 목록을 순서대로 돈다 — 셋업별로 모양이 분명한 것.
 */
// 첫 문제는 가장 알아보기 쉬운 눌림목으로 연다
const SEEDS = [11, 14, 13, 23, 51, 22];
const VISIBLE = 60;
const AFTER = 20;

const CHOICES: SetupLabel[] = ["pullback", "breakout", "none"];

export function LandingQuiz() {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<SetupLabel | null>(null);

  const seed = SEEDS[idx % SEEDS.length];
  const data = useMemo(() => {
    const s = generateScenario(seed);
    const start = DECISION_INDEX - VISIBLE;
    const all = s.candles.slice(start, DECISION_INDEX + AFTER);
    const ma = smaSeries(s.candles.slice(0, DECISION_INDEX + AFTER), 20).slice(start);
    return { label: s.setupLabel, all, ma };
  }, [seed]);

  const answered = choice !== null;
  const correct = choice === data.label;
  const shown = answered ? data.all : data.all.slice(0, VISIBLE);

  function nextChart() {
    setChoice(null);
    setIdx((i) => i + 1);
  }

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[1.6fr_1fr]">
      <div className="relative border-b border-border lg:border-b-0 lg:border-r">
        <span className="absolute left-4 top-3 z-10 font-mono text-[11px] tracking-wide text-muted-foreground/80">
          체험 #{String(idx + 1).padStart(2, "0")}
        </span>
        <CandleSvg
          key={seed}
          candles={shown}
          ma={data.ma.slice(0, shown.length)}
          slots={VISIBLE + AFTER}
          maskFrom={answered ? undefined : VISIBLE}
          markAt={answered ? VISIBLE : undefined}
          revealFrom={answered ? VISIBLE : undefined}
          range={priceRange(shown)}
          padRight={16}
          height={320}
          ariaLabel={answered ? "판단 지점 이후까지 이어진 차트" : "판단 지점까지 공개된 차트"}
        />
      </div>

      <div className="flex flex-col justify-center gap-4 p-5 sm:p-6">
        <p className="text-[14px] font-semibold text-foreground">이 차트는 어떤 모양인가요?</p>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {CHOICES.map((c) => {
            const isAnswer = answered && data.label === c;
            const picked = choice === c;
            return (
              <button
                key={c}
                type="button"
                disabled={answered}
                onClick={() => setChoice(c)}
                className={cn(
                  "h-11 rounded-lg border px-3 text-[14px] font-semibold transition-all",
                  !answered && "border-border text-foreground hover:-translate-y-px hover:border-primary",
                  isAnswer && "border-good bg-good/15 text-foreground",
                  answered && picked && !isAnswer && "border-warn bg-warn/15 text-foreground",
                  answered && !picked && !isAnswer && "border-border text-muted-foreground/50"
                )}
              >
                {SETUP_NAME[c]}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div className="anim-rise flex flex-col gap-4">
            <div>
              <p className={cn("text-[15px] font-semibold", correct ? "text-good" : "text-foreground")}>
                {correct ? "정답입니다." : `정답은 ${SETUP_NAME[data.label]}입니다.`}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{SETUP_HINT[data.label]}</p>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              실제 연습에서는 여기서 멈추지 않습니다. 사기 전에 손절·목표를 적고, 결과를 보기 전에 스스로
              채점합니다.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/onboarding"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
              >
                계획·채점까지 해보기 <ArrowRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={nextChart}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> 다른 차트
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            고르는 순간 정답과, 가려져 있던 이후 {AFTER}봉을 보여드립니다.
          </p>
        )}
      </div>
    </div>
  );
}
