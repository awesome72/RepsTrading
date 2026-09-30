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
  compact,
}: {
  initialAccountSize: number;
  initialRiskPercent: number;
  onChange: (accountSize: number, riskPercent: number) => void;
  /** 설정 화면: 온보딩용 큰 제목 대신 섹션 제목으로 */
  compact?: boolean;
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
      {compact ? (
        <h2 className="text-[17px] font-semibold text-foreground">위험 한도</h2>
      ) : (
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-foreground">얼마를 걸 건가</h1>
      )}

      <div className="flex w-full max-w-xs flex-col gap-2 text-left">
        <label className="text-[13px] font-semibold text-foreground">계좌 금액</label>
        <input
          type="number"
          inputMode="numeric"
          value={accountSize}
          onChange={(e) => commitAccountSize(Number(e.target.value) || 0)}
          className="num h-11 rounded-lg border border-border bg-background px-3 text-[15px] text-foreground outline-none transition-colors focus:border-primary"
        />
        {/* 0이 여러 개인 숫자는 한눈에 안 읽힌다 — 천 단위로 끊어 보여준다 */}
        <p className="num text-[12px] text-muted-foreground">{formatWon(accountSize)}</p>
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

      {/* 이 화면의 주인공 — 앞으로 모든 성과를 재는 자(1R) */}
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-card px-5 py-6 text-[13px] leading-relaxed text-foreground">
        <span className="eyebrow text-muted-foreground">한 번에 최대 잃는 돈</span>
        <span className="num text-[36px] font-bold leading-none tracking-[-0.02em] text-primary">
          {formatWon(riskAmount)}
        </span>
        <span className="text-[12px] text-muted-foreground">계좌의 {riskPercent.toFixed(1)}%</span>
        <p className="mt-2 text-muted-foreground">
          이 {formatWon(riskAmount)}이 앞으로 계속 나올 &lsquo;<Term id="r-multiple">1R</Term>
          &rsquo;입니다.
        </p>
      </div>
    </div>
  );
}
