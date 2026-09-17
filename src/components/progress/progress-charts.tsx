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
import { InfoDot } from "@/components/info-tooltip";
import type { GradeDistribution } from "@/lib/metrics/stats";

const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  fontSize: 12,
};

/**
 * recharts를 쓰는 두 그래프만 모아둔다 — /progress에서 동적 import로 불러온다(스펙 문서 6절:
 * "차트는 동적 import로 코드 스플리팅"). 표본이 5회 미만이면 이 컴포넌트 자체가 렌더되지 않으므로,
 * 통계가 나오기 전까지는 recharts를 아예 내려받지 않는다.
 */
export function ProgressCharts({
  curve,
  grades,
}: {
  curve: { i: number; cum: number }[];
  grades: GradeDistribution;
}) {
  const gradeBars = (["A", "B", "C", "D"] as const).map((g) => ({ grade: g, count: grades[g] }));

  return (
    <>
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
              <RTooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="cum" stroke="var(--brand)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1 text-[14px] font-semibold text-foreground">
          등급 분포
          <InfoDot content="A·B는 계획대로 실행한 거래(A는 판단 근거까지 분명), C는 계획보다 먼저 판 거래, D는 손절을 내리거나 무시한 거래입니다. C·D가 많다면 계획을 지키는 것부터 다시 다잡아야 합니다." />
        </h2>
        <div className="h-[180px] w-full rounded-lg border border-border bg-card p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeBars}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="grade" stroke="var(--muted-text)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted-text)" fontSize={11} tickLine={false} allowDecimals={false} />
              <RTooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
