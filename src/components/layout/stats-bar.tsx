"use client";

import { usePathname } from "next/navigation";
import { InfoDot } from "@/components/info-tooltip";
import { Term } from "@/components/term";
import { useRepLogStore } from "@/lib/rep/log-store";
import { adherenceRate, expectancy, requiredSample, tradedReps } from "@/lib/metrics/stats";
import { DAILY_GOAL, todayTradedCount } from "@/lib/metrics/progress";

const MIN_SAMPLE = 5;

/** 아직 한 번도 연습하지 않은 방문자가 주로 보는 화면 — "현재 0회"는 의미 없는 소음이라 숨긴다 */
const INTRO_PATHS = new Set(["/", "/onboarding", "/login"]);

function Sep() {
  return <span className="text-border">|</span>;
}

/**
 * 지금까지의 성적 한 줄 — 데스크톱은 헤더 안에, 모바일은 헤더 아래 얇은 줄로 들어간다.
 * 서버 기록을 받기 전(또는 로그아웃 상태)에는 "0회"처럼 틀린 숫자를 보여주지 않는다.
 */
export function StatsSummary() {
  const reps = useRepLogStore((s) => s.reps);
  const status = useRepLogStore((s) => s.status);
  const mode = useRepLogStore((s) => s.mode);
  const pathname = usePathname();

  if (INTRO_PATHS.has(pathname) || status !== "ready") return null;

  const n = tradedReps(reps).length;
  const todayCount = todayTradedCount(reps);
  // 하루 목표 진행 — 게스트는 5회 한도라 쓰지 않는다
  const today =
    mode === "server" ? (
      <>
        <span className={`num ${todayCount >= DAILY_GOAL ? "text-good" : "text-foreground"}`}>
          오늘 {todayCount}/{DAILY_GOAL}
          {todayCount >= DAILY_GOAL && " ✓"}
        </span>
        <Sep />
      </>
    ) : null;

  if (n < MIN_SAMPLE) {
    return (
      <span className="flex items-center gap-2.5 text-muted-foreground">
        {today}
        <span className="num text-foreground">{n}회</span>
        <Sep />
        <span>아직 판단하기 이릅니다</span>
      </span>
    );
  }

  const exp = expectancy(reps);
  const adherence = adherenceRate(reps);
  const nStar = requiredSample(reps);
  const remaining = Number.isFinite(nStar) ? Math.max(0, Math.ceil(nStar - n)) : null;

  return (
    <span className="flex items-center gap-2.5 text-muted-foreground">
      {today}
      <span className="num text-foreground">{n}회</span>
      <Sep />
      <span className="flex items-center gap-1">
        <span className="num">
          {remaining !== null ? `결론까지 ${remaining}회` : "결론까지 더 지켜봐야 함"}
        </span>
        <InfoDot content="지금까지의 성적이 실력인지 운인지 판단하려면 이만큼 더 필요합니다. 대부분의 사람이 30~50번 해보고 '이 방법 안 되네' 하며 그만두는데, 그 횟수로는 동전던지기와 구별이 안 됩니다." />
      </span>
      <Sep />
      <span className={`num ${exp >= 0 ? "text-up" : "text-down"}`}>
        <Term id="gi-dae-gap">평균</Term> {exp >= 0 ? "+" : ""}
        {exp.toFixed(2)}R
      </span>
      <Sep />
      <span className="num text-foreground">
        <Term id="jun-su-yul">계획 지킴</Term> {(adherence * 100).toFixed(0)}%
      </span>
    </span>
  );
}

/** lg 미만 전용 — lg 이상에서는 헤더 안의 StatsSummary가 같은 내용을 보여준다 */
export function StatsBar() {
  const pathname = usePathname();
  if (INTRO_PATHS.has(pathname)) return null;

  return (
    <div className="w-full border-b border-border lg:hidden">
      <div className="flex h-9 items-center overflow-x-auto whitespace-nowrap px-4 text-[12px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <StatsSummary />
      </div>
    </div>
  );
}
