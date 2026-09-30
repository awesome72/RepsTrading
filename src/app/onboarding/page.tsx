"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Step1Why } from "@/components/onboarding/step1-why";
import { Step2Risk } from "@/components/onboarding/step2-risk";
import { Step3Setup } from "@/components/onboarding/step3-setup";
import { Step5Plan } from "@/components/onboarding/step5-plan";
import { useAccountStore } from "@/lib/account/store";
import { cn } from "@/lib/utils";

// 4단계(가이드 연습)에서만 차트 라이브러리가 필요하다 — 1~3단계를 보는 동안 미리 받지 않게 나눠 싣는다
const GuidedPractice = dynamic(
  () => import("@/components/onboarding/guided-practice").then((m) => m.GuidedPractice),
  { ssr: false, loading: () => <div className="h-[420px] w-full rounded-xl border border-border bg-card" /> }
);

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const account = useAccountStore();

  useEffect(() => {
    useAccountStore.getState().hydrate();
  }, []);

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function finish() {
    useAccountStore.getState().completeOnboarding();
    router.push("/practice");
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-2.25rem)] flex-col items-center justify-center gap-8 py-8">
      <div className="flex flex-col items-center gap-2.5">
        <span className="num text-[11px] tracking-wide text-muted-foreground">
          {step} / {TOTAL_STEPS}
        </span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i + 1 < step ? "w-6 bg-primary/60" : i + 1 === step ? "w-10 bg-primary" : "w-6 bg-surface-2"
              )}
            />
          ))}
        </div>
      </div>

      {/* 단계가 바뀔 때마다 새로 마운트되어 짧게 떠오른다 */}
      <div key={step} className={cn("anim-rise w-full px-4", step === 4 ? "max-w-4xl" : "max-w-2xl")}>
        {step === 1 && <Step1Why />}
        {step === 2 && (
          <Step2Risk
            initialAccountSize={account.accountSize}
            initialRiskPercent={account.riskPercent}
            onChange={(size, risk) => {
              useAccountStore.getState().setAccountSize(size);
              useAccountStore.getState().setRiskPercent(risk);
            }}
          />
        )}
        {step === 3 && (
          <Step3Setup
            value={account.setupPreference}
            onChange={(v) => useAccountStore.getState().setSetupPreference(v)}
          />
        )}
        {step === 4 && <GuidedPractice onComplete={next} />}
        {step === 5 && <Step5Plan />}
      </div>

      {step !== 4 && (
        <Button size="lg" className="h-12 w-full max-w-2xl text-[15px] font-bold" onClick={step === TOTAL_STEPS ? finish : next}>
          {step === TOTAL_STEPS ? "시작하기" : "다음"}
        </Button>
      )}
    </div>
  );
}
