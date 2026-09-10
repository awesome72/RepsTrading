"use client";

import { useEffect } from "react";
import { InfoTooltip } from "@/components/info-tooltip";
import { useRepLogStore } from "@/lib/rep/log-store";
import { adherenceRate, expectancy, requiredSample, tradedReps } from "@/lib/metrics/stats";

const MIN_SAMPLE = 5;

export function StatsBar() {
  const reps = useRepLogStore((s) => s.reps);

  useEffect(() => {
    useRepLogStore.getState().hydrate();
  }, []);

  const n = tradedReps(reps).length;

  if (n < MIN_SAMPLE) {
    return (
      <div className="w-full border-b border-border bg-surface-2/50">
        <div className="mx-auto flex h-9 w-full max-w-[1280px] items-center justify-center px-4 text-[12px] text-muted-foreground">
          <span className="num">현재 {n}회</span>
          <span className="mx-2">·</span>
          <span>아직 판단하기 이릅니다</span>
        </div>
      </div>
    );
  }

  const exp = expectancy(reps);
  const adherence = adherenceRate(reps);
  const nStar = requiredSample(reps);
  const remaining = Number.isFinite(nStar) ? Math.max(0, Math.ceil(nStar - n)) : null;

  return (
    <div className="w-full border-b border-border bg-surface-2/50">
      <div className="mx-auto flex h-9 w-full max-w-[1280px] items-center justify-center gap-2 px-4 text-[12px] text-foreground">
        <span className="num">현재 {n}회</span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1">
          <span className="num">
            {remaining !== null ? `결론까지 ${remaining}회 남음` : "결론까지는 더 지켜봐야 합니다"}
          </span>
          <InfoTooltip
            content="지금까지의 성적이 실력인지 운인지 판단하려면 이만큼 더 필요합니다. 대부분의 사람이 30~50번 해보고 '이 방법 안 되네' 하며 그만두는데, 그 횟수로는 동전던지기와 구별이 안 됩니다."
            triggerClassName="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground text-[9px] leading-none text-muted-foreground cursor-help"
          >
            ?
          </InfoTooltip>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className={`num ${exp >= 0 ? "text-up" : "text-down"}`}>
          평균 {exp >= 0 ? "+" : ""}
          {exp.toFixed(2)}R
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="num">계획 지킴 {(adherence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
