"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/events";
import { Button } from "@/components/ui/button";
import { useRepLogStore } from "@/lib/rep/log-store";
import { decisionReps } from "@/lib/metrics/stats";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const guestCount = useRepLogStore((s) => (s.mode === "guest" ? decisionReps(s.reps).length : 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = await getBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }
    setStatus("sent");
    trackEvent({ name: "login_link_sent" });
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-2.25rem)] flex-col items-center justify-center py-10">
      <div className="anim-rise flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary font-mono text-[18px] font-bold text-primary-foreground">
            R
          </span>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">로그인</h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            비밀번호 없이, 이메일로 받은 링크로 로그인합니다.
            <br />
            연습 기록이 계정에 저장되어 기기를 바꿔도 이어집니다.
          </p>
        </div>

        {guestCount > 0 && (
          <p className="rounded-xl border border-border bg-background px-4 py-3 text-center text-[12px] leading-relaxed text-muted-foreground">
            게스트로 한 <span className="num text-foreground">{guestCount}</span>회는 로그인하면 계정으로
            옮겨집니다. 메일의 링크는 <span className="text-foreground">지금 이 브라우저에서</span> 열어주세요.
          </p>
        )}

        {status === "sent" ? (
          <div className="anim-rise flex flex-col items-center gap-2 rounded-xl border border-good/40 bg-good/10 px-4 py-5 text-center">
            <p className="text-[14px] font-semibold text-foreground">메일을 보냈습니다</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              <span className="text-foreground">{email}</span>의 메일함에서 로그인 링크를 눌러주세요.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="h-11 rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
            {error && <p className="text-[12px] text-destructive">{error}</p>}
            <Button
              type="submit"
              size="lg"
              disabled={status === "sending"}
              className="h-11 w-full text-[14px] font-bold"
            >
              {status === "sending" ? "보내는 중..." : "로그인 링크 보내기"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
