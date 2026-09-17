"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { GateProgress } from "@/components/gate/gate-progress";
import { InfoDot } from "@/components/info-tooltip";
import { Term } from "@/components/term";
import { useUser } from "@/lib/auth/use-user";
import { useRepLogStore } from "@/lib/rep/log-store";
import { GuestNotice } from "@/components/auth/guest-notice";
import { PaceLine, WeeklySummary } from "@/components/progress/weekly-summary";
import { weeklyComparison } from "@/lib/metrics/progress";
import { evaluateGate } from "@/lib/gate/rules";
import {
  adherenceRate,
  expectancy,
  gradeDistribution,
  luckyBadTrades,
  requiredSample,
  setupAccuracy,
  tradedReps,
  decisionReps,
} from "@/lib/metrics/stats";
import { apiGetProgressSummary, type ProgressSummary } from "@/lib/rep/api";
import type { Rep } from "@/lib/rep/types";
import { cn } from "@/lib/utils";

// recharts는 표본이 5회 이상일 때만 필요하다 — 동적 import로 그 전까지는 내려받지 않는다
// (스펙 문서 6절 "차트는 동적 import로 코드 스플리팅"; BlindChart와 같은 패턴).
const ProgressCharts = dynamic(
  () => import("@/components/progress/progress-charts").then((m) => m.ProgressCharts),
  {
    ssr: false,
    loading: () => (
      <>
        <div className="h-[220px] w-full rounded-lg border border-border bg-card" />
        <div className="h-[180px] w-full rounded-lg border border-border bg-card" />
      </>
    ),
  }
);

const MIN_SAMPLE = 5;

function isGoodJudgment(rep: Rep): boolean {
  return rep.decisionGrade === "A" || rep.decisionGrade === "B";
}

/** 게스트는 로컬에 최대 5개뿐이라 클라이언트에서 그대로 계산한다 (서버 요약이 필요 없다) */
function summaryFromLocalReps(reps: Rep[]): ProgressSummary {
  const traded = tradedReps(reps);
  const n = traded.length;
  const nStar = requiredSample(reps);
  const curve = traded.reduce<{ i: number; cum: number }[]>((acc, r) => {
    const prevCum = acc.length > 0 ? acc[acc.length - 1].cum : 0;
    const cum = Number((prevCum + (r.result?.rMultiple ?? 0)).toFixed(2));
    acc.push({ i: acc.length + 1, cum });
    return acc;
  }, []);
  const matrix = {
    goodGood: traded.filter((r) => isGoodJudgment(r) && (r.result?.rMultiple ?? 0) > 0).length,
    goodBad: traded.filter((r) => isGoodJudgment(r) && (r.result?.rMultiple ?? 0) <= 0).length,
    badGood: traded.filter((r) => !isGoodJudgment(r) && (r.result?.rMultiple ?? 0) > 0).length,
    badBad: traded.filter((r) => !isGoodJudgment(r) && (r.result?.rMultiple ?? 0) <= 0).length,
  };
  // 게스트는 게이트가 없다 — evaluateGate(1, ...)로 계산은 해두되 화면에서 GateProgress를 숨긴다
  const gateEvaluation = evaluateGate(1, reps);
  return {
    n,
    expectancy: expectancy(reps),
    adherence: adherenceRate(reps),
    accuracy: setupAccuracy(reps),
    remaining: Number.isFinite(nStar) ? Math.max(0, Math.ceil(nStar - n)) : null,
    grades: gradeDistribution(reps),
    lucky: luckyBadTrades(reps),
    curve,
    matrix,
    gateLevel: 1,
    gateEvaluation,
    pace: null,
    paceTarget: null,
    weekly: weeklyComparison(reps),
  };
}

export default function ProgressPage() {
  const { user, loading: userLoading } = useUser();
  const guestReps = useRepLogStore((s) => s.reps);
  const logMode = useRepLogStore((s) => s.mode);
  const logStatus = useRepLogStore((s) => s.status);
  // 게스트는 이 브라우저의 기록으로 통계를 보고, 게이트는 로그인 후에 열린다
  const guest = !userLoading && !user;

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);

  function loadSummary() {
    setSummaryError(false);
    apiGetProgressSummary()
      .then(setSummary)
      .catch(() => setSummaryError(true));
  }

  // 다른 기기에서 연습한 기록까지 반영되도록 들어올 때마다 서버에서 다시 받는다.
  // 전체 rep 행이 아니라 이미 계산된 숫자만 받으므로 사용자가 아무리 많이 연습했어도 가볍다.
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummary(null);
      loadSummary();
    }
  }, [user]);

  const guestSummary = useMemo(
    () => (guest ? summaryFromLocalReps(guestReps) : null),
    [guest, guestReps]
  );

  if (guest) {
    if (logStatus !== "ready" || logMode !== "guest" || !guestSummary) {
      return <div className="h-64 py-10" />;
    }
    return (
      <ProgressView
        summary={guestSummary}
        guestBanner={<GuestNotice variant="banner" count={decisionReps(guestReps).length} />}
        showGate={false}
      />
    );
  }

  if (summaryError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-[13px] text-muted-foreground">
        <p>기록을 불러오지 못했습니다. 네트워크 연결을 확인해주세요.</p>
        <button
          type="button"
          onClick={loadSummary}
          className="h-9 rounded-md border border-border bg-card px-4 text-[13px] text-foreground"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (userLoading || !user || !summary) {
    return <div className="h-64 py-10" />;
  }

  return <ProgressView summary={summary} guestBanner={null} showGate />;
}

function ProgressView({
  summary,
  guestBanner,
  showGate,
}: {
  summary: ProgressSummary;
  guestBanner: React.ReactNode;
  showGate: boolean;
}) {
  const { n, curve, grades, matrix, lucky } = summary;

  if (n < MIN_SAMPLE) {
    return (
      <div className="flex flex-col gap-6 py-10">
        <h1 className="text-[20px] font-bold text-foreground">진척</h1>
        {guestBanner}
        <p className="text-[13px] text-muted-foreground">
          {MIN_SAMPLE}회 이상 연습하면 여기에 통계가 나옵니다. (지금 {n}회)
        </p>
        {showGate && <GateProgress evaluation={summary.gateEvaluation} />}
        {showGate && summary.pace && summary.paceTarget !== null && (
          <PaceLine {...summary.pace} target={summary.paceTarget} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-[20px] font-bold text-foreground">진척</h1>
      {guestBanner}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={<Term id="gi-dae-gap">평균 R</Term>}
          value={`${summary.expectancy >= 0 ? "+" : ""}${summary.expectancy.toFixed(2)}R`}
          tone={summary.expectancy >= 0 ? "up" : "down"}
        />
        <StatCard
          label={
            <span className="inline-flex items-center gap-1">
              남은 횟수
              <InfoDot content="지금까지의 성적이 실력인지 운인지 판단하려면 이만큼 더 필요합니다. 대부분의 사람이 30~50번 해보고 '이 방법 안 되네' 하며 그만두는데, 그 횟수로는 동전던지기와 구별이 안 됩니다." />
            </span>
          }
          value={summary.remaining !== null ? `${summary.remaining}회` : "-"}
        />
        <StatCard
          label={<Term id="jun-su-yul">계획 지킴</Term>}
          value={`${Math.round(summary.adherence * 100)}%`}
        />
        <StatCard
          label={<Term id="pan-byeol-jeong-hwak-do">판별 정확도</Term>}
          value={`${Math.round(summary.accuracy * 100)}%`}
        />
      </div>

      {showGate && <GateProgress evaluation={summary.gateEvaluation} />}
      {showGate && summary.pace && summary.paceTarget !== null && (
        <PaceLine {...summary.pace} target={summary.paceTarget} />
      )}

      <WeeklySummary {...summary.weekly} />

      <ProgressCharts curve={curve} grades={grades} />

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1 text-[14px] font-semibold text-foreground">
          판단 × 결과 매트릭스
          <InfoDot content="판단(A/B=좋음, C/D=나쁨)과 결과(R의 부호)는 항상 같이 가지 않습니다. 왼쪽 아래 칸(나쁜 판단·좋은 결과)이 가장 위험합니다 — 운으로 벌었는데 잘했다고 착각하기 쉬운 자리입니다." />
        </h2>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-[12px]">
          <div />
          <div className="py-1 text-muted-foreground">좋은 결과</div>
          <div className="py-1 text-muted-foreground">나쁜 결과</div>
          <div className="flex items-center justify-end pr-2 text-muted-foreground">좋은 판단</div>
          <MatrixCell count={matrix.goodGood} />
          <MatrixCell count={matrix.goodBad} />
          <div className="flex items-center justify-end pr-2 text-muted-foreground">나쁜 판단</div>
          <MatrixCell count={matrix.badGood} warn />
          <MatrixCell count={matrix.badBad} />
        </div>
        {lucky > 0 && (
          <p className="text-[12px] text-warn">
            ⚠ 전체 거래의 {Math.round(lucky * 100)}%가 &ldquo;나쁜 판단인데 운이 좋았던&rdquo;
            거래입니다.
          </p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num text-[20px] font-bold",
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MatrixCell({ count, warn }: { count: number; warn?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border py-3 text-[13px] font-semibold",
        warn && count > 0
          ? "border-warn bg-warn/15 text-warn"
          : "border-border bg-surface-2 text-foreground"
      )}
    >
      {count}
    </div>
  );
}
