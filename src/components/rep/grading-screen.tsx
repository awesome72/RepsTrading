"use client";

import { BlindChart } from "@/components/blind-chart";
import type { Candle } from "@/lib/market/generator";
import type { DecisionGrade, ExitReason, Plan } from "@/lib/rep/types";

const SETUP_LABEL: Record<Plan["setupChoice"], string> = {
  pullback: "눌림목",
  breakout: "돌파",
  other: "기타",
};

const EXIT_LABEL: Record<ExitReason, string> = {
  stop: "계획대로 손절됐습니다.",
  target: "목표가에 도달해 청산됐습니다.",
  manual: "직접 청산했습니다 (계획에서 벗어남).",
  timeout: "손절도 목표도 닿지 않아 시간 초과로 강제 청산됐습니다.",
  pass: "포지션을 잡지 않았습니다.",
};

const GRADE_OPTIONS: { value: DecisionGrade; label: string; desc: string }[] = [
  {
    value: "A",
    label: "계획대로 하고 손절도 지켰다",
    desc: "설정한 손절가와 목표가를 그대로 따랐습니다.",
  },
  {
    value: "B",
    label: "대체로 지켰지만 조금 흔들렸다",
    desc: "판단은 지켰지만 중간에 살짝 흔들렸습니다.",
  },
  {
    value: "C",
    label: "규칙을 어겼다 (다만 손실 한도는 넘지 않았다)",
    desc: "계획을 벗어났지만 정해둔 손실 한도 안에서 끝났습니다.",
  },
  {
    value: "D",
    label: "손실 한도를 넘겼거나 손절을 무시했다",
    desc: "손절을 무시했거나 정해둔 손실 한도를 넘겼습니다.",
  },
];

type GradingScreenProps = {
  plan: Plan;
  exitReason: ExitReason;
  candles: Candle[];
  onGrade: (grade: DecisionGrade) => void;
  /** 온보딩 가이드 연습에서 이 화면의 의미를 짚어주는 말풍선 */
  coachMessage?: string;
};

export function GradingScreen({
  plan,
  exitReason,
  candles,
  onGrade,
  coachMessage,
}: GradingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        {coachMessage && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
            {coachMessage}
          </div>
        )}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[26px] font-bold leading-snug text-foreground">
            결과를 보기 전에, 당신의 판단부터 채점합니다.
          </h1>
          <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
            돈을 벌었는지 먼저 보면, 사람은 반드시 &ldquo;벌었으니 잘한 거지&rdquo;라고
            채점합니다. 그래서 순서를 바꿉니다.
          </p>
        </div>

        <BlindChart
          candles={candles}
          label="이번 판단"
          hidePriceLabels
          height={220}
        />

        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 text-[13px] text-foreground">
          <p>셋업: {SETUP_LABEL[plan.setupChoice]}</p>
          <p className="num">손절가: {Math.round(plan.stopPrice).toLocaleString("ko-KR")}원</p>
          <p className="num">
            목표: {Math.round(plan.targetPrice).toLocaleString("ko-KR")}원 ({plan.targetR}R)
          </p>
          <p className="pt-1 text-muted-foreground">{EXIT_LABEL[exitReason]}</p>
        </div>

        <div className="flex flex-col gap-2">
          {GRADE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onGrade(opt.value)}
              className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-surface-2"
            >
              <span className="text-[14px] font-semibold text-foreground">
                {opt.value} — {opt.label}
              </span>
              <span className="text-[12px] leading-snug text-muted-foreground">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
