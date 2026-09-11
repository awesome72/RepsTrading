"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useUser } from "@/lib/auth/use-user";
import { useRepLogStore } from "@/lib/rep/log-store";
import { decisionReps } from "@/lib/metrics/stats";
import { GuestNotice } from "@/components/auth/guest-notice";
import { apiListReps, type ServerRep } from "@/lib/rep/api";
import { generateScenario } from "@/lib/market/scenario";
import type { DecisionGrade, SetupChoice } from "@/lib/rep/types";
import { cn } from "@/lib/utils";

const BlindChart = dynamic(() => import("@/components/blind-chart").then((m) => m.BlindChart), {
  ssr: false,
});

const SETUP_LABEL: Record<SetupChoice, string> = {
  pullback: "눌림목",
  breakout: "돌파",
  other: "기타",
};

function toCsv(reps: ServerRep[]): string {
  const header = ["날짜", "셋업", "R", "등급", "계획 지킴"];
  const rows = reps.map((r) => [
    new Date(r.committed_at).toLocaleString("ko-KR"),
    SETUP_LABEL[r.plan_setup],
    r.r_result !== undefined ? r.r_result.toFixed(2) : "",
    r.decision_grade ?? "",
    r.adhered ? "지킴" : "어김",
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function JournalPage() {
  const { user, loading: userLoading } = useUser();
  const [reps, setReps] = useState<ServerRep[] | null>(null);
  const [setupFilter, setSetupFilter] = useState<"all" | SetupChoice>("all");
  const [gradeFilter, setGradeFilter] = useState<"all" | DecisionGrade>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const guestReps = useRepLogStore((s) => (s.mode === "guest" ? s.reps : null));

  useEffect(() => {
    if (!user) return;
    apiListReps()
      .then(setReps)
      .catch(() => setReps([]));
  }, [user]);

  const traded = useMemo(
    () => (reps ?? []).filter((r) => r.exit_reason !== "pass" && r.r_result !== undefined),
    [reps]
  );

  const filtered = traded.filter(
    (r) =>
      (setupFilter === "all" || r.plan_setup === setupFilter) &&
      (gradeFilter === "all" || r.decision_grade === gradeFilter)
  );

  if (!userLoading && !user) {
    return (
      <div className="py-10">
        <GuestNotice
          variant="page"
          title="기록 화면은 로그인 후 볼 수 있습니다."
          count={guestReps ? decisionReps(guestReps).length : 0}
        />
      </div>
    );
  }

  if (userLoading || !user || reps === null) {
    return <div className="h-64 py-10" />;
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold text-foreground">기록</h1>
        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={() => downloadCsv(toCsv(filtered), "reps.csv")}
          className="h-8 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground disabled:opacity-40"
        >
          CSV 내보내기
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={setupFilter}
          onChange={(e) => setSetupFilter(e.target.value as "all" | SetupChoice)}
          className="h-8 rounded-md border border-border bg-card px-2 text-[12px] text-foreground"
        >
          <option value="all">전체 셋업</option>
          <option value="pullback">눌림목</option>
          <option value="breakout">돌파</option>
          <option value="other">기타</option>
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value as "all" | DecisionGrade)}
          className="h-8 rounded-md border border-border bg-card px-2 text-[12px] text-foreground"
        >
          <option value="all">전체 등급</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center text-[13px] text-muted-foreground">
          <p>아직 연습 기록이 없습니다. 첫 연습은 2분이면 끝납니다.</p>
          <Link
            href="/practice"
            className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
          >
            시작하기
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-card text-left text-muted-foreground">
                <th className="px-3 py-2 font-normal">날짜</th>
                <th className="px-3 py-2 font-normal">셋업</th>
                <th className="px-3 py-2 text-right font-normal">R</th>
                <th className="px-3 py-2 font-normal">등급</th>
                <th className="px-3 py-2 font-normal">계획 지킴</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <RepRow
                  key={r.id}
                  rep={r}
                  expanded={expandedId === r.id}
                  onToggle={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RepRow({
  rep,
  expanded,
  onToggle,
}: {
  rep: ServerRep;
  expanded: boolean;
  onToggle: () => void;
}) {
  const r = rep.r_result ?? 0;
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
      >
        <td className="num px-3 py-2 text-muted-foreground">
          {new Date(rep.committed_at).toLocaleDateString("ko-KR")}
        </td>
        <td className="px-3 py-2 text-foreground">{SETUP_LABEL[rep.plan_setup]}</td>
        <td
          className={cn(
            "num px-3 py-2 text-right",
            r > 0 ? "text-up" : r < 0 ? "text-down" : "text-foreground"
          )}
        >
          {r > 0 ? "+" : ""}
          {r.toFixed(1)}R
        </td>
        <td className="px-3 py-2 text-foreground">{rep.decision_grade ?? "-"}</td>
        <td className="px-3 py-2 text-foreground">{rep.adhered ? "지킴" : "어김"}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={5} className="bg-surface-2/40 px-3 py-3">
            <RepDetail rep={rep} />
          </td>
        </tr>
      )}
    </>
  );
}

function RepDetail({ rep }: { rep: ServerRep }) {
  const scenario = useMemo(() => generateScenario(rep.scenario_seed), [rep.scenario_seed]);
  const entryPrice = scenario.candles[scenario.decisionIndex - 1].close;
  const targetPrice = entryPrice + rep.plan_target_r * (entryPrice - rep.plan_stop);
  const start = Math.max(0, scenario.decisionIndex - 20);
  const end = (rep.exit_index ?? scenario.decisionIndex) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted-foreground">
        <span>셋업: {SETUP_LABEL[rep.plan_setup]}</span>
        <span className="num">손절가: {Math.round(rep.plan_stop).toLocaleString("ko-KR")}원</span>
        <span className="num">목표가: {Math.round(targetPrice).toLocaleString("ko-KR")}원</span>
        <span className="num">
          청산가: {rep.exit_price ? Math.round(rep.exit_price).toLocaleString("ko-KR") : "-"}원
        </span>
      </div>
      <BlindChart
        candles={scenario.candles.slice(start, end)}
        label={`연습 #${rep.scenario_seed.toString(16).slice(-4).toUpperCase()}`}
        height={240}
      />
    </div>
  );
}
