"use client";

import { cn } from "@/lib/utils";
import type { SetupPreference } from "@/lib/account/store";

function PullbackSpark() {
  return (
    <svg viewBox="0 0 100 40" className="h-10 w-full text-primary">
      <polyline
        points="0,35 15,25 30,15 40,22 50,26 60,17 75,9 100,4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BreakoutSpark() {
  return (
    <svg viewBox="0 0 100 40" className="h-10 w-full text-primary">
      <polyline
        points="0,25 20,24 35,26 50,25 65,24 78,25 88,12 100,3"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const OPTIONS: {
  value: SetupPreference;
  label: string;
  desc: string;
  spark?: () => React.ReactElement;
  /** 1단계에서는 고른 셋업 하나만 반복 연습해야 하므로 잠긴다 (setupMixFor 참고) */
  lockedBelowGate?: number;
  /** 잠금이 풀렸을 때 보여줄 설명 (없으면 desc를 그대로 쓴다) */
  unlockedDesc?: string;
}[] = [
  {
    value: "pullback",
    label: "눌림목",
    desc: "오르던 주식이 잠깐 쉴 때 산다",
    spark: PullbackSpark,
  },
  {
    value: "breakout",
    label: "돌파",
    desc: "오랫동안 못 넘던 가격을 뚫을 때 산다",
    spark: BreakoutSpark,
  },
  {
    value: "both",
    label: "둘 다",
    desc: "어려우니 나중에 고르세요 (2단계 게이트 이후 해금)",
    unlockedDesc: "이제 두 셋업을 모두 섞어 연습합니다",
    lockedBelowGate: 2,
  },
];

export function Step3Setup({
  value,
  onChange,
  gateLevel = 1,
}: {
  value: SetupPreference;
  onChange: (v: SetupPreference) => void;
  /** 게이트 단계 — "둘 다"는 이 값이 lockedBelowGate 미만일 때만 잠긴다. 생략하면 1단계로 취급한다 */
  gateLevel?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-[24px] font-bold text-foreground">어떤 모양을 살 건가</h1>
      <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Spark = opt.spark;
          const locked = opt.lockedBelowGate !== undefined && gateLevel < opt.lockedBelowGate;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={locked}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors disabled:opacity-40",
                value === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-surface-2"
              )}
            >
              {Spark ? <Spark /> : <div className="h-10" />}
              <span className="text-[14px] font-semibold text-foreground">{opt.label}</span>
              <span className="text-[12px] leading-snug text-muted-foreground">
                {!locked && opt.unlockedDesc ? opt.unlockedDesc : opt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
