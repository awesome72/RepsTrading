"use client";

import { useEffect, useMemo } from "react";
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
  const reps = useRepLogStore((s) => s.reps);
  const gateLevel = useAccountStore((s) => s.gateLevel);

  useEffect(() => {
    useRepLogStore.getState().hydrate();
    useAccountStore.getState().hydrate();
  }, []);

  const traded = useMemo(() => tradedReps(reps), [reps]);
  const n = traded.length;
  const gateEvaluation = useMemo(() => evaluateGate(gateLevel, reps), [gateLevel, reps]);

  if (n < MIN_SAMPLE) {
    return (
      <div className="flex flex-col gap-6 py-10">
        <h1 className="text-[20px] font-bold text-foreground">진척</h1>
        <p className="text-[13px] text-muted-foreground">
          {MIN_SAMPLE}회 이상 연습하면 여기에 통계가 나옵니다. (지금 {n}회)
        </p>
        <GateProgress evaluation={gateEvaluation} />
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
          label="평균 R"
          value={`${exp >= 0 ? "+" : ""}${exp.toFixed(2)}R`}
          tone={exp >= 0 ? "up" : "down"}
        />
        <StatCard label="남은 횟수" value={remaining !== null ? `${remaining}회` : "-"} />
        <StatCard label="계획 지킴" value={`${Math.round(adherence * 100)}%`} />
        <StatCard label="판별 정확도" value={`${Math.round(accuracy * 100)}%`} />
      </div>

      <GateProgress evaluation={gateEvaluation} />

      <section className="flex flex-col gap-2">
        <h2 className="text-[14px] font-semibold text-foreground">R 누적 곡선</h2>
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
        <h2 className="text-[14px] font-semibold text-foreground">등급 분포</h2>
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
        <h2 className="text-[14px] font-semibold text-foreground">판단 × 결과 매트릭스</h2>
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
  label: string;
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
