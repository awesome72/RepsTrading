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
  locked?: boolean;
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
    locked: true,
  },
];

export function Step3Setup({
  value,
  onChange,
}: {
  value: SetupPreference;
  onChange: (v: SetupPreference) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-[24px] font-bold text-foreground">어떤 모양을 살 건가</h1>
      <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Spark = opt.spark;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={opt.locked}
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
              <span className="text-[12px] leading-snug text-muted-foreground">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
