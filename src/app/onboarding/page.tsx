"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Step1Why } from "@/components/onboarding/step1-why";
import { Step2Risk } from "@/components/onboarding/step2-risk";
import { Step3Setup } from "@/components/onboarding/step3-setup";
import { GuidedPractice } from "@/components/onboarding/guided-practice";
import { Step5Plan } from "@/components/onboarding/step5-plan";
import { useAccountStore } from "@/lib/account/store";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-6 rounded-full",
              i + 1 <= step ? "bg-primary" : "bg-surface-2"
            )}
          />
        ))}
      </div>

      <div className={cn("w-full px-4", step === 4 ? "max-w-4xl" : "max-w-2xl")}>
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
