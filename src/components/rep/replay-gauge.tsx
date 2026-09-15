import { cn } from "@/lib/utils";
import type { ReplayStatus } from "@/lib/rep/replay-coach";

function formatR(r: number): string {
  return `${r > 0 ? "+" : ""}${r.toFixed(1)}R`;
}

/**
 * 재생 중 "손절선 ↔ 목표선 사이 어디쯤인가". 모바일에서는 이 패널이 화면 아래에 고정되어
 * 차트를 가리므로 최대한 낮게(두 줄) 유지한다. 코치 문구는 여기가 아니라 차트 위(ReplayCoachNote)에 띄운다.
 */
export function ReplayGauge({ status }: { status: ReplayStatus }) {
  const { currentR, toTargetR, toStopR, position, tone } = status;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "num text-[18px] font-bold leading-none",
            currentR > 0 ? "text-up" : currentR < 0 ? "text-down" : "text-foreground"
          )}
        >
          {formatR(currentR)}
        </span>
        <span className="num text-[11px] text-muted-foreground">
          목표까지 {toTargetR.toFixed(1)}R · 손절까지 {toStopR.toFixed(1)}R
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>손절</span>
        <div className="relative h-2 flex-1 rounded-full bg-surface-2" aria-hidden>
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-300",
              tone === "danger" ? "bg-warn" : tone === "profit" ? "bg-up" : "bg-muted-foreground/60"
            )}
            style={{ width: `${position * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[left] duration-300"
            style={{ left: `${position * 100}%` }}
          />
        </div>
        <span>목표</span>
      </div>
    </div>
  );
}

/**
 * 계획을 흔드는 순간의 한 줄 — 재생 중 시선이 가 있는 차트 위에 띄운다.
 * 패널 안에 넣으면 문구가 나타날 때마다 "지금 판다" 버튼이 밀려 오클릭을 부른다.
 */
export function ReplayCoachNote({ message, tone }: { message: string; tone: ReplayStatus["tone"] }) {
  return (
    <p
      role="status"
      className={cn(
        "pointer-events-none absolute inset-x-3 top-12 z-10 rounded-md border px-3 py-2 text-[12px] leading-snug text-foreground shadow-lg backdrop-blur sm:right-auto sm:max-w-md",
        tone === "danger" ? "border-warn/60 bg-warn/20" : "border-border bg-card/90"
      )}
    >
      {message}
    </p>
  );
}
