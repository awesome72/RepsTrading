"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "done" | "error" | "skipped";

const RATING_LABELS = ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"];

/** 5회째·20회째 판단 결과 화면에서만 한 번 뜨는 한 문항 설문. 로그인 사용자만 대상이다. */
export function RevealSurvey({ milestone }: { milestone: 5 | 20 }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(rating: number) {
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone, rating }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "전송하지 못했습니다.");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송하지 못했습니다.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-lg border border-good/40 bg-good/10 px-4 py-3 text-[12px] text-foreground">
        응답 감사합니다.
      </p>
    );
  }
  if (status === "skipped") return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[13px] font-semibold text-foreground">
        이 화면이 다음 판단에 도움이 됐나요? ({milestone}회째)
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {RATING_LABELS.map((label, i) => (
          <button
            key={i}
            type="button"
            disabled={status === "submitting"}
            onClick={() => submit(i + 1)}
            title={label}
            className={cn(
              "num flex h-9 items-center justify-center rounded-md border border-border bg-background text-[13px] font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-50"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{RATING_LABELS[0]}</span>
        <span>{RATING_LABELS.at(-1)}</span>
      </div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <button
        type="button"
        onClick={() => setStatus("skipped")}
        className="self-start text-[11px] text-muted-foreground underline-offset-2 hover:underline"
      >
        나중에
      </button>
    </div>
  );
}
