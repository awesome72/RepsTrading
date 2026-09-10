"use client";

import { useState } from "react";
import { Term } from "@/components/term";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export function Step2Risk({
  initialAccountSize,
  initialRiskPercent,
  onChange,
}: {
  initialAccountSize: number;
  initialRiskPercent: number;
  onChange: (accountSize: number, riskPercent: number) => void;
}) {
  const [accountSize, setAccountSize] = useState(initialAccountSize);
  const [riskPercent, setRiskPercent] = useState(initialRiskPercent);

  const riskAmount = (accountSize * riskPercent) / 100;
  const overWarn = riskPercent > 2;

  function commitAccountSize(v: number) {
    setAccountSize(v);
    onChange(v, riskPercent);
  }
  function commitRiskPercent(v: number) {
    setRiskPercent(v);
    onChange(accountSize, v);
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-[24px] font-bold text-foreground">얼마를 걸 건가</h1>

      <div className="flex w-full max-w-xs flex-col gap-2 text-left">
        <label className="text-[13px] font-semibold text-foreground">계좌 금액</label>
        <input
          type="number"
          inputMode="numeric"
          value={accountSize}
          onChange={(e) => commitAccountSize(Number(e.target.value) || 0)}
          className="num h-10 rounded-md border border-border bg-card px-3 text-[14px] text-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2 text-left">
        <label className="text-[13px] font-semibold text-foreground">
          한 번에 걸 위험 비율 ({riskPercent.toFixed(1)}%)
        </label>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={riskPercent}
          onChange={(e) => commitRiskPercent(Number(e.target.value))}
          className="w-full accent-primary"
        />
        {overWarn && (
          <p className="text-[12px] text-warn">
            2%를 넘었습니다. 한 번의 실수로 계좌가 크게 흔들릴 수 있습니다.
          </p>
        )}
      </div>

      <div className="w-full max-w-xs rounded-lg border border-border bg-card p-4 text-[13px] leading-relaxed text-foreground">
        <p>
          한 번에 최대{" "}
          <span className="num font-semibold text-primary">{formatWon(riskAmount)}</span>까지만
          잃겠습니다 ({riskPercent.toFixed(1)}%)
        </p>
        <p className="mt-2 text-muted-foreground">
          이 {formatWon(riskAmount)}이 앞으로 계속 나올 &lsquo;<Term id="r-multiple">1R</Term>
          &rsquo;입니다.
        </p>
      </div>
    </div>
  );
}
