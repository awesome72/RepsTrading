"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/term";
import { cn } from "@/lib/utils";
import type { Plan, SetupChoice } from "@/lib/rep/types";

type RepCardFormProps = {
  entryPrice: number;
  onSave: (plan: Plan) => void;
};

const SETUP_OPTIONS: {
  value: SetupChoice;
  label: string;
  termId?: string;
  desc: string;
}[] = [
  {
    value: "pullback",
    label: "눌림목",
    termId: "nul-lim-mok",
    desc: "오르던 주식이 잠깐 쉬며 내려온 자리",
  },
  {
    value: "breakout",
    label: "돌파",
    termId: "dol-pa",
    desc: "못 넘던 벽을 뚫고 올라가는 자리",
  },
  { value: "other", label: "기타", desc: "위 두 모양에 해당하지 않음" },
];

const TARGET_PRESETS = [1, 2, 3] as const;

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export function RepCardForm({ entryPrice, onSave }: RepCardFormProps) {
  const [setupChoice, setSetupChoice] = useState<SetupChoice | null>(null);
  const [stopInput, setStopInput] = useState("");
  const [targetMode, setTargetMode] = useState<number | "custom" | null>(null);
  const [customTargetInput, setCustomTargetInput] = useState("");

  const stopPrice = Number(stopInput);
  const hasStop = stopInput.trim() !== "" && !Number.isNaN(stopPrice) && stopPrice > 0;
  const stopValid = hasStop && stopPrice < entryPrice;

  const riskPerShare = stopValid ? entryPrice - stopPrice : 0;
  const stopPct = hasStop ? ((stopPrice - entryPrice) / entryPrice) * 100 : 0;

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

  function handleSave() {
    if (!canSave || !setupChoice || targetPrice === null) return;
    onSave({
      setupChoice,
      entryPrice,
      stopPrice,
      targetPrice,
      targetR,
    });
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
              <span className="text-[13px] font-semibold text-foreground">
                {opt.termId ? <Term id={opt.termId}>{opt.label}</Term> : opt.label}
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
        {hasStop && !stopValid && (
          <p className="text-[12px] text-destructive">
            손절가는 현재가({formatWon(entryPrice)})보다 낮아야 합니다.
          </p>
        )}
        {stopValid && (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            현재가 대비 {stopPct.toFixed(1)}%입니다. 이만큼 내려가면 자동으로 팝니다.
            <br />이 금액이 당신의 <Term id="r-multiple">1R</Term> ={" "}
            <span className="num text-foreground">{formatWon(riskPerShare)}</span>입니다.
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
          disabled={!canSave}
          onClick={handleSave}
          className="h-12 w-full text-[15px] font-bold"
        >
          계획 저장 (저장 후 수정 불가)
        </Button>
      </div>
    </div>
  );
}
