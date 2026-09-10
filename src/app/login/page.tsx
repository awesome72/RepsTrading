"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
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
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-2.25rem)] flex-col items-center justify-center gap-6 py-8">
      <div className="flex w-full max-w-xs flex-col items-center gap-2 text-center">
        <h1 className="text-[22px] font-bold text-foreground">로그인</h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          비밀번호 없이 이메일로 받은 링크로 로그인합니다. 연습 기록이 서버에 안전하게
          저장됩니다.
        </p>
      </div>

      {status === "sent" ? (
        <div className="w-full max-w-xs rounded-lg border border-good/40 bg-good/10 px-4 py-3 text-center text-[13px] leading-relaxed text-foreground">
          {email}로 로그인 링크를 보냈습니다. 메일함을 확인해주세요.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="h-10 rounded-md border border-border bg-card px-3 text-[14px] text-foreground outline-none focus:border-primary"
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
  );
}
