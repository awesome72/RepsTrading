"use client";

import { useState } from "react";
import { useRepLogStore } from "@/lib/rep/log-store";
import type { AdviceStreamEvent } from "@/lib/ai/advisor";
import { cn } from "@/lib/utils";

/** loading = 첫 글자를 기다리는 중, streaming = 글자가 흘러들어오는 중 */
type Status = "idle" | "loading" | "streaming" | "done" | "error";

const FALLBACK_ERROR = "AI 조언을 가져오지 못했습니다.";

/**
 * 결과 공개 후 사용자가 직접 눌러야만 호출되는 선택적 AI 코치 조언.
 * 매 판단마다 자동으로 뜨는 즉시 피드백(다음 한 가지)과는 별개 기능이며, 그쪽은 규칙 기반을 그대로 유지한다.
 * 응답은 글자 조각 단위로 흘려받아 쓰이는 대로 보여준다 — 다 만들어질 때까지 빈 화면으로 기다리지 않는다.
 */
export function AiAdvice({ repId }: { repId: string | null }) {
  const guest = useRepLogStore((s) => s.mode === "guest");
  const [status, setStatus] = useState<Status>("idle");
  const [advice, setAdvice] = useState("");
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
    setAdvice("");
    try {
      const res = await fetch(`/api/reps/${repId}/advice`, { method: "POST" });
      // 첫 글자 전에 실패하면 서버가 JSON 에러와 상태 코드로 답한다
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? FALLBACK_ERROR);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as AdviceStreamEvent;
          if (event.t === "delta") {
            setAdvice((prev) => prev + event.text);
            setStatus("streaming");
          } else if (event.t === "error") {
            throw new Error(event.message);
          } else {
            finished = true;
          }
        }
      }
      if (!finished) throw new Error("AI 조언이 중간에 끊겼습니다. 잠시 후 다시 시도해주세요.");
      setStatus("done");
    } catch (e) {
      setAdvice("");
      setError(e instanceof Error ? e.message : FALLBACK_ERROR);
      setStatus("error");
    }
  }

  if (status === "streaming" || status === "done") {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-[11px] font-semibold text-primary">AI 코치의 조언</p>
        <p className="text-[13px] leading-relaxed text-foreground" aria-live="polite">
          {advice}
          {status === "streaming" && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary align-middle" aria-hidden />
          )}
        </p>
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
        {status === "loading" ? "AI 코치가 이번 판단을 보고 있습니다..." : "AI 코치에게 물어보기"}
      </button>
      {error && (
        <p className="text-[12px] text-destructive">
          {error} <span className="text-muted-foreground">다시 눌러서 재시도할 수 있습니다.</span>
        </p>
      )}
    </div>
  );
}
