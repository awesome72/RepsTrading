"use client";

import { useState } from "react";
import { useRepLogStore } from "@/lib/rep/log-store";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";

/**
 * 결과 공개 후 사용자가 직접 눌러야만 호출되는 선택적 AI 코치 조언.
 * 매 판단마다 자동으로 뜨는 즉시 피드백(다음 한 가지)과는 별개 기능이며, 그쪽은 규칙 기반을 그대로 유지한다.
 */
export function AiAdvice({ repId }: { repId: string | null }) {
  const guest = useRepLogStore((s) => s.mode === "guest");
  const [status, setStatus] = useState<Status>("idle");
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 게스트는 서버에 조언을 요청할 대상이 없다 — 로그인을 유도한다.
  // (호출부에서 온보딩 가이드 연습은 이 컴포넌트 자체를 렌더링하지 않는다)
  if (guest) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
        로그인하면 이번 판단에 대한 AI 코치의 조언을 받을 수 있습니다.
      </p>
    );
  }

  if (!repId) return null;

  async function requestAdvice() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/reps/${repId}/advice`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "AI 조언을 가져오지 못했습니다.");
      setAdvice(body.advice as string);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 조언을 가져오지 못했습니다.");
      setStatus("error");
    }
  }

  if (status === "done" && advice) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-[11px] font-semibold text-primary">AI 코치의 조언</p>
        <p className="text-[13px] leading-relaxed text-foreground">{advice}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={requestAdvice}
        disabled={status === "loading"}
        className={cn(
          "h-10 rounded-md border border-dashed border-border text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-60"
        )}
      >
        {status === "loading" ? "AI 코치에게 물어보는 중..." : "AI 코치에게 물어보기"}
      </button>
      {error && (
        <p className="text-[12px] text-destructive">
          {error} <span className="text-muted-foreground">다시 눌러서 재시도할 수 있습니다.</span>
        </p>
      )}
    </div>
  );
}
