"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useUser } from "@/lib/auth/use-user";
import { useRepLogStore } from "@/lib/rep/log-store";
import { decisionReps, tradedReps } from "@/lib/metrics/stats";
import { GuestNotice } from "@/components/auth/guest-notice";
import { apiListRepsAll, apiListRepsPage, type ServerRep } from "@/lib/rep/api";
import { generateScenario } from "@/lib/market/scenario";
import type { DecisionGrade, Rep, SetupChoice } from "@/lib/rep/types";
import { cn } from "@/lib/utils";

const BlindChart = dynamic(() => import("@/components/blind-chart").then((m) => m.BlindChart), {
  ssr: false,
});

const SETUP_LABEL: Record<SetupChoice, string> = {
  pullback: "눌림목",
  breakout: "돌파",
  other: "기타",
};

/** 화면에 한 번에 보여줄 개수 — "더 보기"를 누르면 이만큼씩 이어서 받는다 */
const PAGE_SIZE = 30;

/** 표·상세 카드가 실제로 쓰는 필드만 모은 공통 모양 — 서버 기록과 게스트 로컬 기록을 같은 표로 그린다 */
type JournalRow = {
  id: string;
  date: number;
  setup: SetupChoice;
  r: number;
  grade: DecisionGrade | undefined;
  adhered: boolean;
  seed: number;
  stopPrice: number;
  targetR: number;
  exitPrice: number | undefined;
  exitIndex: number | undefined;
};

function serverRepToRow(r: ServerRep): JournalRow {
  return {
    id: r.id,
    date: new Date(r.committed_at).getTime(),
    setup: r.plan_setup,
    r: r.r_result ?? 0,
    grade: r.decision_grade,
    adhered: r.adhered ?? false,
    seed: r.scenario_seed,
    stopPrice: r.plan_stop,
    targetR: r.plan_target_r,
    exitPrice: r.exit_price,
    exitIndex: r.exit_index,
  };
}

/** 게스트는 서버 왕복 없이 이 브라우저에 이미 있는 기록(최대 5개)을 그대로 보여준다 */
function guestRepToRow(r: Rep): JournalRow {
  return {
    id: r.id,
    date: r.committedAt ?? r.openedAt,
    setup: r.plan?.setupChoice ?? "other",
    r: r.result?.rMultiple ?? 0,
    grade: r.decisionGrade,
    adhered: r.adhered ?? false,
    seed: r.seed,
    stopPrice: r.plan?.stopPrice ?? 0,
    targetR: r.plan?.targetR ?? 0,
    exitPrice: r.exitPrice,
    exitIndex: r.exitIndex,
  };
}

function toCsv(rows: JournalRow[]): string {
  const header = ["날짜", "셋업", "R", "등급", "계획 지킴"];
  const csvRows = rows.map((r) => [
    new Date(r.date).toLocaleString("ko-KR"),
    SETUP_LABEL[r.setup],
    r.r.toFixed(2),
    r.grade ?? "",
    r.adhered ? "지킴" : "어김",
  ]);
  return [header, ...csvRows]
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [setupFilter, setSetupFilter] = useState<"all" | SetupChoice>("all");
  const [gradeFilter, setGradeFilter] = useState<"all" | DecisionGrade>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const guestReps = useRepLogStore((s) => (s.mode === "guest" ? s.reps : null));
  const logStatus = useRepLogStore((s) => s.status);
  const logMode = useRepLogStore((s) => s.mode);
  const guest = !userLoading && !user;

  // 표에는 실제로 산 기록만 보여준다(GuestNotice의 N/5회는 지나간 것도 포함해 다른 화면과 맞춘다)
  const guestRows = useMemo(() => {
    if (!guestReps) return [];
    return tradedReps(guestReps)
      .slice()
      .sort((a, b) => (b.committedAt ?? 0) - (a.committedAt ?? 0))
      .map(guestRepToRow);
  }, [guestReps]);
  const guestDecisionCount = guestReps ? decisionReps(guestReps).length : 0;

  const filterParams = useMemo(
    () => ({
      traded: true as const,
      setup: setupFilter === "all" ? undefined : setupFilter,
      grade: gradeFilter === "all" ? undefined : gradeFilter,
    }),
    [setupFilter, gradeFilter]
  );

  // 필터가 바뀌는 순간 이전 필터로 보낸 요청(특히 "더 보기")의 응답은 버린다 —
  // 늦게 도착한 옛 결과가 새 목록 뒤에 붙으면 두 필터가 섞인 표가 된다.
  const generationRef = useRef(0);

  // 필터가 바뀌면 처음부터 다시 받는다 — 로그인 여부가 바뀔 때도 마찬가지
  useEffect(() => {
    if (!user) return;
    const gen = ++generationRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReps(null);
    setLoadingMore(false);
    apiListRepsPage({ ...filterParams, limit: PAGE_SIZE })
      .then((r) => {
        if (gen !== generationRef.current) return;
        setReps(r.reps);
        setHasMore(r.hasMore);
      })
      .catch(() => {
        if (gen !== generationRef.current) return;
        setReps([]);
        setHasMore(false);
      });
  }, [user, filterParams]);

  function loadMore() {
    if (!reps || loadingMore) return;
    const before = reps.at(-1)?.committed_at;
    if (!before) return;
    const gen = generationRef.current;
    setLoadingMore(true);
    apiListRepsPage({ ...filterParams, limit: PAGE_SIZE, before })
      .then((r) => {
        if (gen !== generationRef.current) return;
        setReps((prev) => [...(prev ?? []), ...r.reps]);
        setHasMore(r.hasMore);
      })
      .catch(() => {})
      .finally(() => {
        if (gen === generationRef.current) setLoadingMore(false);
      });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const all = await apiListRepsAll(filterParams);
      downloadCsv(toCsv(all.map(serverRepToRow)), "reps.csv");
    } catch {
      // 다운로드 실패는 조용히 무시한다 — 버튼을 다시 누르면 된다
    } finally {
      setExporting(false);
    }
  }

  if (guest) {
    if (logStatus !== "ready" || logMode !== "guest") {
      return <div className="h-64 py-10" />;
    }
    return (
      <div className="flex flex-col gap-4 py-6">
        <h1 className="text-[20px] font-bold text-foreground">기록</h1>
        <GuestNotice variant="banner" count={guestDecisionCount} />
        {guestRows.length === 0 ? (
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
          <RepTable
            rows={guestRows}
            expandedId={expandedId}
            onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
          />
        )}
      </div>
    );
  }

  if (userLoading || !user || reps === null) {
    return <div className="h-64 py-10" />;
  }

  const rows = reps.map(serverRepToRow);

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold text-foreground">기록</h1>
        <button
          type="button"
          disabled={rows.length === 0 || exporting}
          onClick={exportCsv}
          className="h-8 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground disabled:opacity-40"
        >
          {exporting ? "내보내는 중..." : "CSV 내보내기"}
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

      {rows.length === 0 && (setupFilter !== "all" || gradeFilter !== "all") ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center text-[13px] text-muted-foreground">
          <p>이 조건에 맞는 기록이 없습니다.</p>
          <button
            type="button"
            onClick={() => {
              setSetupFilter("all");
              setGradeFilter("all");
            }}
            className="rounded-md border border-border bg-card px-4 py-2 text-[13px] text-foreground"
          >
            필터 해제
          </button>
        </div>
      ) : rows.length === 0 ? (
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
        <>
          <RepTable
            rows={rows}
            expandedId={expandedId}
            onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
          />
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="h-9 rounded-md border border-border bg-card text-[13px] text-foreground disabled:opacity-60"
            >
              {loadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function RepTable({
  rows,
  expandedId,
  onToggle,
}: {
  rows: JournalRow[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
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
          {rows.map((row) => (
            <RepRow key={row.id} row={row} expanded={expandedId === row.id} onToggle={() => onToggle(row.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RepRow({
  row,
  expanded,
  onToggle,
}: {
  row: JournalRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
      >
        <td className="num px-3 py-2 text-muted-foreground">
          {new Date(row.date).toLocaleDateString("ko-KR")}
        </td>
        <td className="px-3 py-2 text-foreground">{SETUP_LABEL[row.setup]}</td>
        <td
          className={cn(
            "num px-3 py-2 text-right",
            row.r > 0 ? "text-up" : row.r < 0 ? "text-down" : "text-foreground"
          )}
        >
          {row.r > 0 ? "+" : ""}
          {row.r.toFixed(1)}R
        </td>
        <td className="px-3 py-2 text-foreground">{row.grade ?? "-"}</td>
        <td className="px-3 py-2 text-foreground">{row.adhered ? "지킴" : "어김"}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={5} className="bg-surface-2/40 px-3 py-3">
            <RepDetail row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

function RepDetail({ row }: { row: JournalRow }) {
  const scenario = useMemo(() => generateScenario(row.seed), [row.seed]);
  const entryPrice = scenario.candles[scenario.decisionIndex - 1].close;
  const targetPrice = entryPrice + row.targetR * (entryPrice - row.stopPrice);
  const start = Math.max(0, scenario.decisionIndex - 20);
  const end = (row.exitIndex ?? scenario.decisionIndex) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted-foreground">
        <span>셋업: {SETUP_LABEL[row.setup]}</span>
        <span className="num">손절가: {Math.round(row.stopPrice).toLocaleString("ko-KR")}원</span>
        <span className="num">목표가: {Math.round(targetPrice).toLocaleString("ko-KR")}원</span>
        <span className="num">
          청산가: {row.exitPrice ? Math.round(row.exitPrice).toLocaleString("ko-KR") : "-"}원
        </span>
      </div>
      <BlindChart
        candles={scenario.candles.slice(start, end)}
        label={`연습 #${row.seed.toString(16).slice(-4).toUpperCase()}`}
        height={240}
      />
    </div>
  );
}
