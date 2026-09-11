"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/term";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { positionSize } from "@/lib/metrics/position";
import { cn } from "@/lib/utils";
import type { Plan, SetupChoice } from "@/lib/rep/types";

type RepCardFormProps = {
  entryPrice: number;
  /** 온보딩에서 정한 계좌 금액과 한 번에 걸 위험 비율 — 1R 금액과 살 수량을 계산한다 */
  accountSize: number;
  riskPercent: number;
  onSave: (plan: Plan) => void;
  saving?: boolean;
};

const SETUP_OPTIONS: {
  value: SetupChoice;
  label: string;
  termId?: string;
  desc: string;
  key: string;
}[] = [
  {
    value: "pullback",
    label: "눌림목",
    termId: "nul-lim-mok",
    desc: "오르던 주식이 잠깐 쉬며 내려온 자리",
    key: "1",
  },
  {
    value: "breakout",
    label: "돌파",
    termId: "dol-pa",
    desc: "못 넘던 벽을 뚫고 올라가는 자리",
    key: "2",
  },
  { value: "other", label: "기타", desc: "위 두 모양에 해당하지 않음", key: "3" },
];

const TARGET_PRESETS = [1, 2, 3] as const;
const STOP_PRESETS = [-2, -3, -5] as const;
const RISK_WARN_PCT = 5;

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export function RepCardForm({ entryPrice, accountSize, riskPercent, onSave, saving }: RepCardFormProps) {
  const [setupChoice, setSetupChoice] = useState<SetupChoice | null>(null);
  const [stopInput, setStopInput] = useState("");
  const [targetMode, setTargetMode] = useState<number | "custom" | null>(null);
  const [customTargetInput, setCustomTargetInput] = useState("");
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  const stopPrice = Number(stopInput);
  const hasStop = stopInput.trim() !== "" && !Number.isNaN(stopPrice) && stopPrice > 0;
  const stopValid = hasStop && stopPrice < entryPrice;

  const riskPerShare = stopValid ? entryPrice - stopPrice : 0;
  const stopPct = hasStop ? ((stopPrice - entryPrice) / entryPrice) * 100 : 0;
  // 온보딩에서 정한 계좌·위험 비율로, 손절 시 손실이 1R이 되도록 수량을 정한다
  const position = stopValid ? positionSize({ accountSize, riskPercent, entryPrice, stopPrice }) : null;

  const targetPrice = useMemo(() => {
    if (!stopValid) return null;
    if (targetMode === "custom") {
      const t = Number(customTargetInput);
      return customTargetInput.trim() !== "" && !Number.isNaN(t) ? t : null;
    }
    if (typeof targetMode === "number") {
      return entryPrice + riskPerShare * targetMode;
    }
    return null;
  }, [stopValid, targetMode, customTargetInput, entryPrice, riskPerShare]);

  const targetR =
    targetPrice !== null && riskPerShare > 0
      ? (targetPrice - entryPrice) / riskPerShare
      : 0;

  const canSave = setupChoice !== null && stopValid && targetPrice !== null && targetPrice > entryPrice;

  function doSave() {
    if (!canSave || !setupChoice || targetPrice === null) return;
    onSave({
      setupChoice,
      entryPrice,
      stopPrice,
      targetPrice,
      targetR,
    });
  }

  function attemptSave() {
    if (!canSave) return;
    if (Math.abs(stopPct) > RISK_WARN_PCT) {
      setShowRiskWarning(true);
      return;
    }
    doSave();
  }

  useHotkeys({
    "1": () => setSetupChoice("pullback"),
    "2": () => setSetupChoice("breakout"),
    "3": () => setSetupChoice("other"),
    Enter: attemptSave,
  });

  function applyStopPreset(pct: number) {
    setStopInput(String(Math.round(entryPrice * (1 + pct / 100))));
  }

  if (showRiskWarning) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-warn/40 bg-warn/10 p-4">
        <p className="text-[14px] font-semibold text-foreground">
          손절폭이 현재가의 {Math.abs(stopPct).toFixed(1)}%로, 5%보다 넓습니다.
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          손절이 멀면 1R을 지키기 위해 살 수 있는 수량이 줄고, 틀렸다는 걸 확인하기까지 오래 걸립니다.
          정말 이대로 저장할까요?
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-10 flex-1 text-[13px]"
            onClick={() => setShowRiskWarning(false)}
          >
            다시 정하기
          </Button>
          <Button className="h-10 flex-1 text-[13px]" onClick={doSave} disabled={saving}>
            그래도 저장
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-foreground">
          [1] 어떤 모양이라서 사나요?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SETUP_OPTIONS.map((opt) => (
            // Term이 <button>을 렌더링하므로 바깥 선택 카드는 button이 아닌
            // role="button" div로 만든다 (button 안에 button을 중첩할 수 없다).
            <div
              key={opt.value}
              role="button"
              tabIndex={0}
              onClick={() => setSetupChoice(opt.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSetupChoice(opt.value);
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-md border px-2 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                setupChoice === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-surface-2"
              )}
            >
              <span className="flex items-center justify-between text-[13px] font-semibold text-foreground">
                {opt.termId ? <Term id={opt.termId}>{opt.label}</Term> : opt.label}
                <span className="text-[10px] font-normal opacity-50">{opt.key}</span>
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {opt.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-foreground">
          [2] 얼마까지 내려가면 틀린 건가요? (<Term id="son-jeol">손절</Term>가)
        </p>
        <input
          type="number"
          inputMode="numeric"
          value={stopInput}
          onChange={(e) => setStopInput(e.target.value)}
          placeholder={`현재가 ${formatWon(entryPrice)}보다 낮은 가격`}
          className="num h-10 rounded-md border border-border bg-card px-3 text-[14px] text-foreground outline-none focus:border-primary"
        />
        <div className="flex gap-1.5">
          {STOP_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyStopPreset(pct)}
              className="h-7 flex-1 rounded-md border border-border bg-card text-[12px] font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              {pct}%
            </button>
          ))}
        </div>
        {hasStop && !stopValid && (
          <p className="text-[12px] text-destructive">
            손절가는 현재가({formatWon(entryPrice)})보다 낮아야 합니다.
          </p>
        )}
        {stopValid && (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            현재가 대비 {stopPct.toFixed(1)}%입니다. 이만큼 내려가면 자동으로 팝니다.
            <br />
            1주당 <span className="num text-foreground">{formatWon(riskPerShare)}</span>을 잃는
            계획입니다.
            {position && position.shares > 0 && (
              <>
                {" "}
                당신의 <Term id="r-multiple">1R</Term>(
                <span className="num text-foreground">{formatWon(position.riskAmount)}</span>, 계좌의{" "}
                {riskPercent}%)을 지키려면{" "}
                <span className="num font-semibold text-foreground">{position.shares.toLocaleString("ko-KR")}주</span>
                를 삽니다.
                {position.cappedByAccount && " (계좌 금액 한도라 이보다 더 살 수 없어서, 손절 시 손실은 1R보다 작습니다.)"}
              </>
            )}
            {position && position.shares === 0 && (
              <span className="text-warn">
                {" "}
                손절폭이 넓어서 1R({formatWon(position.riskAmount)}) 안에서는 1주도 살 수 없습니다.
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-foreground">[3] 목표는 어디인가요?</p>
        <div className="grid grid-cols-4 gap-2">
          {TARGET_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={!stopValid}
              onClick={() => setTargetMode(r)}
              className={cn(
                "h-9 rounded-md border text-[13px] font-semibold transition-colors disabled:opacity-40",
                targetMode === r
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground hover:bg-surface-2"
              )}
            >
              {r}R
            </button>
          ))}
          <button
            type="button"
            disabled={!stopValid}
            onClick={() => setTargetMode("custom")}
            className={cn(
              "h-9 rounded-md border text-[13px] font-semibold transition-colors disabled:opacity-40",
              targetMode === "custom"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-foreground hover:bg-surface-2"
            )}
          >
            직접입력
          </button>
        </div>
        {targetMode === "custom" && (
          <input
            type="number"
            inputMode="numeric"
            value={customTargetInput}
            onChange={(e) => setCustomTargetInput(e.target.value)}
            placeholder="목표가"
            className="num h-10 rounded-md border border-border bg-card px-3 text-[14px] text-foreground outline-none focus:border-primary"
          />
        )}
        {targetPrice !== null && targetPrice > entryPrice && (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            손절폭의 {targetR.toFixed(1)}배 = 목표가{" "}
            <span className="num text-foreground">{formatWon(targetPrice)}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-center text-[11px] text-muted-foreground">저장하면 못 고칩니다</p>
        <Button
          size="lg"
          disabled={!canSave || saving}
          onClick={attemptSave}
          className="h-12 w-full text-[15px] font-bold"
        >
          {saving ? "저장 중..." : "계획 저장 (저장 후 수정 불가)"}{" "}
          <span className="ml-1.5 text-[11px] font-normal opacity-60">Enter</span>
        </Button>
      </div>
    </div>
  );
}
