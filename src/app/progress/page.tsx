"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GateProgress } from "@/components/gate/gate-progress";
import { InfoDot } from "@/components/info-tooltip";
import { Term } from "@/components/term";
import { useUser } from "@/lib/auth/use-user";
import { useRepLogStore } from "@/lib/rep/log-store";
import { useAccountStore } from "@/lib/account/store";
import { evaluateGate } from "@/lib/gate/rules";
import {
  adherenceRate,
  expectancy,
  gradeDistribution,
  luckyBadTrades,
  requiredSample,
  setupAccuracy,
  tradedReps,
} from "@/lib/metrics/stats";
import type { Rep } from "@/lib/rep/types";
import { cn } from "@/lib/utils";

const MIN_SAMPLE = 5;

function isGoodJudgment(rep: Rep): boolean {
  return rep.decisionGrade === "A" || rep.decisionGrade === "B";
}

export default function ProgressPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const reps = useRepLogStore((s) => s.reps);
  const status = useRepLogStore((s) => s.status);
  const gateLevel = useAccountStore((s) => s.gateLevel);
  const gateSynced = useAccountStore((s) => s.serverSynced);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [userLoading, user, router]);

  // 다른 기기에서 연습한 기록까지 반영되도록 들어올 때마다 서버에서 다시 받는다
  useEffect(() => {
    if (user) useRepLogStore.getState().refresh();
  }, [user]);

  const traded = useMemo(() => tradedReps(reps), [reps]);
  const n = traded.length;
  const gateEvaluation = useMemo(() => evaluateGate(gateLevel, reps), [gateLevel, reps]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-[13px] text-muted-foreground">
        <p>기록을 불러오지 못했습니다. 네트워크 연결을 확인해주세요.</p>
        <button
          type="button"
          onClick={() => useRepLogStore.getState().refresh()}
          className="h-9 rounded-md border border-border bg-card px-4 text-[13px] text-foreground"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (userLoading || !user || status !== "ready") {
    return <div className="h-64 py-10" />;
  }

  if (n < MIN_SAMPLE) {
    return (
      <div className="flex flex-col gap-6 py-10">
        <h1 className="text-[20px] font-bold text-foreground">진척</h1>
        <p className="text-[13px] text-muted-foreground">
          {MIN_SAMPLE}회 이상 연습하면 여기에 통계가 나옵니다. (지금 {n}회)
        </p>
        {gateSynced && <GateProgress evaluation={gateEvaluation} />}
      </div>
    );
  }

  const exp = expectancy(reps);
  const adherence = adherenceRate(reps);
  const accuracy = setupAccuracy(reps);
  const nStar = requiredSample(reps);
  const remaining = Number.isFinite(nStar) ? Math.max(0, Math.ceil(nStar - n)) : null;
  const grades = gradeDistribution(reps);
  const lucky = luckyBadTrades(reps);

  const curve = traded.reduce<{ i: number; cum: number }[]>((acc, r) => {
    const prevCum = acc.length > 0 ? acc[acc.length - 1].cum : 0;
    const cum = Number((prevCum + (r.result?.rMultiple ?? 0)).toFixed(2));
    acc.push({ i: acc.length + 1, cum });
    return acc;
  }, []);

  const gradeBars = (["A", "B", "C", "D"] as const).map((g) => ({ grade: g, count: grades[g] }));

  const matrix = {
    goodGood: traded.filter((r) => isGoodJudgment(r) && (r.result?.rMultiple ?? 0) > 0).length,
    goodBad: traded.filter((r) => isGoodJudgment(r) && (r.result?.rMultiple ?? 0) <= 0).length,
    badGood: traded.filter((r) => !isGoodJudgment(r) && (r.result?.rMultiple ?? 0) > 0).length,
    badBad: traded.filter((r) => !isGoodJudgment(r) && (r.result?.rMultiple ?? 0) <= 0).length,
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-[20px] font-bold text-foreground">진척</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={<Term id="gi-dae-gap">평균 R</Term>}
          value={`${exp >= 0 ? "+" : ""}${exp.toFixed(2)}R`}
          tone={exp >= 0 ? "up" : "down"}
        />
        <StatCard
          label={
            <span className="inline-flex items-center gap-1">
              남은 횟수
              <InfoDot content="지금까지의 성적이 실력인지 운인지 판단하려면 이만큼 더 필요합니다. 대부분의 사람이 30~50번 해보고 '이 방법 안 되네' 하며 그만두는데, 그 횟수로는 동전던지기와 구별이 안 됩니다." />
            </span>
          }
          value={remaining !== null ? `${remaining}회` : "-"}
        />
        <StatCard
          label={<Term id="jun-su-yul">계획 지킴</Term>}
          value={`${Math.round(adherence * 100)}%`}
        />
        <StatCard
          label={<Term id="pan-byeol-jeong-hwak-do">판별 정확도</Term>}
          value={`${Math.round(accuracy * 100)}%`}
        />
      </div>

      {gateSynced && <GateProgress evaluation={gateEvaluation} />}

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1 text-[14px] font-semibold text-foreground">
          R 누적 곡선
          <InfoDot content="매 판단마다 번 R을 계속 더한 값입니다. 선이 꾸준히 우상향이면 실력이 늘고 있다는 뜻이고, 들쭉날쭉하면 아직 표본이 부족하거나 계획을 자주 바꾸고 있다는 신호입니다." />
        </h2>
        <div className="h-[220px] w-full rounded-lg border border-border bg-card p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="var(--muted-text)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted-text)" fontSize={11} tickLine={false} />
              <RTooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="cum" stroke="var(--brand)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1 text-[14px] font-semibold text-foreground">
          등급 분포
          <InfoDot content="판단이 A/B/C/D 중 어디에 몰려 있는지 보여줍니다. 등급 기준은 채점 화면에서 매번 다시 볼 수 있습니다 — C·D가 많다면 계획을 지키는 것부터 다시 다잡아야 합니다." />
        </h2>
        <div className="h-[180px] w-full rounded-lg border border-border bg-card p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeBars}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="grade" stroke="var(--muted-text)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted-text)" fontSize={11} tickLine={false} allowDecimals={false} />
              <RTooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

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
