import { Term } from "@/components/term";
import { DAILY_GOAL, type PeriodStats } from "@/lib/metrics/progress";
import { cn } from "@/lib/utils";

type Metric = {
  label: React.ReactNode;
  value: (s: PeriodStats) => number;
  format: (v: number) => string;
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

const METRICS: Metric[] = [
  { label: "연습", value: (s) => s.count, format: (v) => `${v}회` },
  { label: <Term id="jun-su-yul">계획 지킴</Term>, value: (s) => s.adherence, format: pct },
  { label: "A 비율", value: (s) => s.aRate, format: pct },
  { label: <Term id="pan-byeol-jeong-hwak-do">판별 정확도</Term>, value: (s) => s.accuracy, format: pct },
  {
    label: <Term id="gi-dae-gap">평균 R</Term>,
    value: (s) => s.expectancy,
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`,
  },
];

/** 이번 주와 지난주를 같은 지표로 비교한다 — 점수나 연속 기록이 아니라 "나아졌는가"만 본다 */
export function WeeklySummary({ thisWeek, lastWeek }: { thisWeek: PeriodStats; lastWeek: PeriodStats }) {
  const comparable = thisWeek.count > 0 && lastWeek.count > 0;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[14px] font-semibold text-foreground">이번 주 (월요일부터)</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-card text-left text-muted-foreground">
              <th className="px-3 py-2 font-normal" />
              <th className="px-3 py-2 text-right font-normal">이번 주</th>
              <th className="px-3 py-2 text-right font-normal">지난주</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m, i) => {
              const now = m.value(thisWeek);
              const prev = m.value(lastWeek);
              const diff = now - prev;
              const showNow = i === 0 || thisWeek.count > 0;
              const showPrev = i === 0 || lastWeek.count > 0;
              return (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{m.label}</td>
                  <td className="num px-3 py-2 text-right text-foreground">
                    {showNow ? m.format(now) : "-"}
                    {comparable && Math.abs(diff) > 1e-9 && (
                      <span className={cn("ml-1.5 text-[11px]", diff > 0 ? "text-good" : "text-warn")}>
                        {diff > 0 ? "▲" : "▼"}
                      </span>
                    )}
                  </td>
                  <td className="num px-3 py-2 text-right text-muted-foreground">{showPrev ? m.format(prev) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] leading-snug text-muted-foreground">
        {lastWeek.count === 0
          ? "지난주 기록이 없어 비교는 다음 주부터 보입니다."
          : "한 주의 평균 R은 운에 크게 흔들립니다. 계획 지킴과 A 비율이 나아지고 있는지를 먼저 보세요."}
      </p>
    </section>
  );
}

/** 최근 속도로 이번 단계의 누적 횟수 조건까지 며칠 남았는지 */
export function PaceLine({
  perDay,
  daysLeft,
  remaining,
  target,
}: {
  perDay: number;
  daysLeft: number | null;
  remaining: number;
  target: number;
}) {
  if (remaining === 0) return null;
  return (
    <p className="rounded-lg border border-border bg-card px-4 py-3 text-[13px] leading-relaxed text-foreground">
      {daysLeft !== null ? (
        <>
          최근 7일 하루 평균 <span className="num">{perDay.toFixed(1)}</span>회 — 이 속도면 누적{" "}
          <span className="num">{target}</span>회까지 약 <span className="num font-semibold">{daysLeft}</span>일
          남았습니다.
        </>
      ) : (
        <>
          최근 7일에 연습이 없어 도달 시점을 추정하지 않습니다. 하루 {DAILY_GOAL}회씩이면 누적{" "}
          <span className="num">{target}</span>회까지 약{" "}
          <span className="num font-semibold">{Math.ceil(remaining / DAILY_GOAL)}</span>일입니다.
        </>
      )}
    </p>
  );
}
