"use client";

import { useEffect, useState } from "react";
import { BlindChart } from "@/components/blind-chart";
import { generateScenario, visibleCandles, type Scenario } from "@/lib/market/scenario";

export default function PracticePage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    // 시나리오는 매번 랜덤이라 SSR과 절대 일치할 수 없다 — 마운트 후 클라이언트에서만 생성한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScenario(generateScenario());
  }, []);

  return (
    <div className="flex flex-col gap-4 py-6">
      <p className="text-[14px] text-muted-foreground">
        이 차트를 보고 판단하세요. 오른쪽 화면은 아직 나오지 않습니다.
      </p>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="md:w-[70%]">
          {scenario ? (
            <BlindChart
              candles={visibleCandles(scenario)}
              label={`연습 #${scenario.seed.toString(16).slice(-4).toUpperCase()}`}
            />
          ) : (
            <div className="h-[420px] w-full rounded-lg border border-border bg-card" />
          )}
        </div>
        <div className="rounded-lg border border-dashed border-border md:w-[30%]" />
      </div>
    </div>
  );
}
