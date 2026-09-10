"use client";

import { useEffect, useMemo, useState } from "react";
import { BlindChart } from "@/components/blind-chart";
import { useRepLogStore } from "@/lib/rep/log-store";
import { generateScenario } from "@/lib/market/scenario";
import type { DecisionGrade, Rep, SetupChoice } from "@/lib/rep/types";
import { cn } from "@/lib/utils";

const SETUP_LABEL: Record<SetupChoice, string> = {
  pullback: "눌림목",
  breakout: "돌파",
  other: "기타",
};

function toCsv(reps: Rep[]): string {
  const header = ["날짜", "셋업", "R", "등급", "계획 지킴"];
  const rows = reps.map((r) => [
    new Date(r.committedAt ?? r.openedAt).toLocaleString("ko-KR"),
    r.plan ? SETUP_LABEL[r.plan.setupChoice] : "",
    r.result ? r.result.rMultiple.toFixed(2) : "",
    r.decisionGrade ?? "",
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
  const reps = useRepLogStore((s) => s.reps);
  const [setupFilter, setSetupFilter] = useState<"all" | SetupChoice>("all");
  const [gradeFilter, setGradeFilter] = useState<"all" | DecisionGrade>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    useRepLogStore.getState().hydrate();
  }, []);

  const traded = useMemo(
    () => reps.filter((r) => r.exitReason !== "pass" && r.result && r.plan),
    [reps]
  );

  const filtered = traded.filter(
    (r) =>
      (setupFilter === "all" || r.plan?.setupChoice === setupFilter) &&
      (gradeFilter === "all" || r.decisionGrade === gradeFilter)
  );

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
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-[13px] text-muted-foreground">
          아직 연습 기록이 없습니다. 첫 연습은 2분이면 끝납니다.
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
  rep: Rep;
  expanded: boolean;
  onToggle: () => void;
}) {
  const r = rep.result?.rMultiple ?? 0;
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
      >
        <td className="num px-3 py-2 text-muted-foreground">
          {new Date(rep.committedAt ?? rep.openedAt).toLocaleDateString("ko-KR")}
        </td>
        <td className="px-3 py-2 text-foreground">
          {rep.plan ? SETUP_LABEL[rep.plan.setupChoice] : "-"}
        </td>
        <td className={cn("num px-3 py-2 text-right", r > 0 ? "text-up" : r < 0 ? "text-down" : "text-foreground")}>
          {r > 0 ? "+" : ""}
          {r.toFixed(1)}R
        </td>
        <td className="px-3 py-2 text-foreground">{rep.decisionGrade ?? "-"}</td>
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

function RepDetail({ rep }: { rep: Rep }) {
  const scenario = useMemo(() => generateScenario(rep.seed), [rep.seed]);
  const start = Math.max(0, scenario.decisionIndex - 20);
  const end = (rep.exitIndex ?? scenario.decisionIndex) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted-foreground">
        <span>셋업: {rep.plan ? SETUP_LABEL[rep.plan.setupChoice] : "-"}</span>
        <span className="num">손절가: {rep.plan ? Math.round(rep.plan.stopPrice).toLocaleString("ko-KR") : "-"}원</span>
        <span className="num">목표가: {rep.plan ? Math.round(rep.plan.targetPrice).toLocaleString("ko-KR") : "-"}원</span>
        <span className="num">청산가: {rep.exitPrice ? Math.round(rep.exitPrice).toLocaleString("ko-KR") : "-"}원</span>
      </div>
      <BlindChart candles={scenario.candles.slice(start, end)} label={`연습 #${rep.seed.toString(16).slice(-4).toUpperCase()}`} height={240} />
    </div>
  );
}
