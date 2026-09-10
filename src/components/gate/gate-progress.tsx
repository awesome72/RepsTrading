import { cn } from "@/lib/utils";
import type { GateEvaluation } from "@/lib/gate/types";

const LEVEL_LABEL: Record<number, string> = { 1: "G1 실행", 2: "G2 판별", 3: "G3 전환" };

export function GateProgress({ evaluation }: { evaluation: GateEvaluation }) {
  const unmet = evaluation.requirements.filter((r) => !r.met);
  // 목표까지 가장 덜 채워진(비율이 가장 낮은) 항목을 강조한다
  const focusId = unmet
    .map((r) => ({ id: r.id, ratio: r.target === 0 ? 1 : r.current / r.target }))
    .sort((a, b) => a.ratio - b.ratio)[0]?.id;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <p className="text-[13px] font-semibold text-foreground">
        {LEVEL_LABEL[evaluation.level] ?? `G${evaluation.level}`} 진행 상황
      </p>
      <div className="flex flex-col gap-3">
        {evaluation.requirements.map((r) => {
          const ratio = r.target === 0 ? 1 : Math.min(1, r.current / r.target);
          const gap =
            r.unit === "%" ? `${Math.max(0, r.target - r.current).toFixed(1)}%p 부족` : "부족";
          return (
            <div key={r.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="num text-foreground">
                  {r.current}
                  {r.unit} / {r.target}
                  {r.unit} {r.met && "✓"}
                  {!r.met && r.id === focusId && (
                    <span className="ml-1 text-warn">← {gap}</span>
                  )}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn("h-full rounded-full", r.met ? "bg-good" : "bg-primary")}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {focusId && (
        <p className="text-[12px] text-warn">
          지금 여기에 집중하세요: {evaluation.requirements.find((r) => r.id === focusId)?.label}
        </p>
      )}
    </div>
  );
}
