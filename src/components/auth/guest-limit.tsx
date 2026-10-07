import Link from "next/link";
import { ArrowRight, Shapes } from "lucide-react";
import { Term } from "@/components/term";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { GUEST_REP_LIMIT } from "@/lib/rep/log-store";
import { guestSummary } from "@/lib/rep/guest-summary";
import type { Rep } from "@/lib/rep/types";
import { cn } from "@/lib/utils";

function Stat({ label, value, sub, tone }: { label: React.ReactNode; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-background px-4 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("num whitespace-nowrap text-[18px] font-bold leading-none sm:text-[22px]", tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground")}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

/**
 * 게스트 연습 한도(5회)에 닿았을 때의 화면. 지금까지 쌓인 숫자를 보여주고,
 * 로그인하면 그대로 이어진다는 걸 구체적으로 알린다. 로그인하지 않아도 계속할 수 있는 판별 퀴즈로도 안내한다.
 * 점수·배지처럼 보이지 않게, 진척 화면과 같은 지표(계획 지킴·평균 R·판별 정확도)만 담담하게 쓴다.
 */
export function GuestLimit({ reps }: { reps: Rep[] }) {
  const s = guestSummary(reps);
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const r = s.expectancy;

  return (
    <div className="anim-rise mx-auto flex w-full max-w-xl flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <TrackOnMount event={{ name: "guest_limit_reached" }} />
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-primary">게스트 연습 {GUEST_REP_LIMIT}회 완료</span>
        <h1 className="text-[24px] font-bold leading-snug tracking-[-0.02em] text-foreground sm:text-[28px]">
          {s.decisions}번의 판단이 여기 쌓였습니다
        </h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          로그인하면 이 기록이 그대로 계정으로 옮겨지고, 여기서부터 이어서 연습할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat
          label={<Term id="jun-su-yul">계획 지킴</Term>}
          value={pct(s.adherence)}
          sub={s.traded > 0 ? `산 ${s.traded}번 중` : "산 판단 없음"}
        />
        <Stat
          label={<Term id="gi-dae-gap">평균 R</Term>}
          value={r === null ? "—" : `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`}
          tone={r === null ? undefined : r >= 0 ? "up" : "down"}
        />
        <Stat label="판별 정확도" value={pct(s.accuracy)} sub={`판단 ${s.decisions}번`} />
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {GUEST_REP_LIMIT}회는 시작일 뿐입니다. 이 숫자가 실력인지 운인지는 수십 번이 쌓여야 보입니다.
      </p>

      <div className="flex flex-col gap-2">
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
        >
          로그인하고 이어서 하기 <ArrowRight className="size-4" />
        </Link>
        <p className="text-center text-[12px] text-muted-foreground">
          비밀번호 없이 이메일 링크로 · 메일의 링크는 지금 이 브라우저에서 열어주세요
        </p>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
          <Shapes className="size-4" />
        </span>
        <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">
          로그인 없이 계속하고 싶다면, 기록이 남지 않아 횟수 제한이 없는 판별 퀴즈가 있습니다.
        </p>
        <Link href="/quiz" className="shrink-0 text-[13px] font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">
          퀴즈 하기
        </Link>
      </div>
    </div>
  );
}
