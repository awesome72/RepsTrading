"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Step2Risk } from "@/components/onboarding/step2-risk";
import { Step3Setup } from "@/components/onboarding/step3-setup";
import { useAccountStore, type SetupPreference } from "@/lib/account/store";
import { useRepLogStore } from "@/lib/rep/log-store";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * 온보딩 이후 계좌 금액·위험 비율·셋업 선호를 바꾸는 화면.
 * 게스트도 쓸 수 있다 — 값은 이 브라우저에 바로 반영되고, 서버 저장만 로그인 후로 미뤄진다.
 */
export default function SettingsPage() {
  const guest = useRepLogStore((s) => s.mode === "guest");
  const hydrated = useAccountStore((s) => s.hydrated);
  const accountSize = useAccountStore((s) => s.accountSize);
  const riskPercent = useAccountStore((s) => s.riskPercent);
  const setupPreference = useAccountStore((s) => s.setupPreference);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useAccountStore.getState().hydrate();
  }, []);

  function handleRiskChange(size: number, risk: number) {
    useAccountStore.getState().setAccountSize(size);
    useAccountStore.getState().setRiskPercent(risk);
    setSaveState("idle");
  }

  function handleSetupChange(v: SetupPreference) {
    useAccountStore.getState().setSetupPreference(v);
    setSaveState("idle");
  }

  async function handleSave() {
    setSaveState("saving");
    setError(null);
    try {
      await useAccountStore.getState().saveSettings();
      setSaveState("saved");
    } catch (e) {
      if (guest) {
        // 로그인 전이라 서버 저장(401)은 건너뛴다 — 로컬에는 이미 반영됐다
        setSaveState("saved");
        return;
      }
      setError(e instanceof Error ? e.message : "설정을 저장하지 못했습니다.");
      setSaveState("error");
    }
  }

  if (!hydrated) {
    return <div className="h-64 py-10" />;
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <h1 className="text-[20px] font-bold text-foreground">설정</h1>

      {guest && (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          게스트로 이용 중입니다 — 이 설정은 이 브라우저에만 저장됩니다.{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
          하면 계정에 저장되어 기기를 바꿔도 유지됩니다.
        </p>
      )}

      <Step2Risk
        initialAccountSize={accountSize}
        initialRiskPercent={riskPercent}
        onChange={handleRiskChange}
      />

      <Step3Setup value={setupPreference} onChange={handleSetupChange} />

      <div className="flex flex-col items-center gap-2">
        <Button
          size="lg"
          className="h-12 w-full max-w-xs text-[15px] font-bold"
          disabled={accountSize <= 0 || saveState === "saving"}
          onClick={handleSave}
        >
          {saveState === "saving" ? "저장 중..." : "저장"}
        </Button>
        {saveState === "saved" && <p className="text-[12px] text-good">저장했습니다.</p>}
        {error && <p className="text-[12px] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
