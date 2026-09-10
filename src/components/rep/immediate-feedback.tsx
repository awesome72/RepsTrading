import { cn } from "@/lib/utils";
import { getFeedback } from "@/lib/feedback/rules";
import { adherenceRate, requiredSample, tradedReps } from "@/lib/metrics/stats";
import type { Rep } from "@/lib/rep/types";

type ImmediateFeedbackProps = {
  /** 방금 끝난 rep까지 포함된 전체 기록 (마지막 원소가 이번 rep) */
  logReps: Rep[];
};

function describeJudgement(rep: Rep): string {
  const r = rep.result?.rMultiple ?? 0;
  switch (rep.decisionGrade) {
    case "A":
      return r < 0
        ? "계획대로 손절했습니다. 손실이지만 잘한 거래입니다."
        : "계획대로 목표까지 지켰습니다. 잘한 거래입니다.";
    case "B":
      return "대체로 계획을 지켰습니다. 다음엔 조금 더 흔들리지 않게 해보세요.";
    case "C":
      return "규칙을 벗어났습니다. 손실 한도는 넘지 않았지만 되짚어볼 필요가 있습니다.";
    case "D":
      return "손실 한도를 넘겼거나 손절을 무시했습니다. 이번엔 원칙을 지키지 못했습니다.";
    default:
      return "이번 판단이 기록되었습니다.";
  }
}

export function ImmediateFeedback({ logReps }: ImmediateFeedbackProps) {
  const before = logReps.slice(0, -1);
  const current = logReps.at(-1);
  if (!current) return null;

  const adherenceBefore = adherenceRate(before) * 100;
  const adherenceAfter = adherenceRate(logReps) * 100;

  const nStarBefore = requiredSample(before);
  const nStarAfter = requiredSample(logReps);
  const remainingBefore = Number.isFinite(nStarBefore)
    ? Math.max(0, Math.ceil(nStarBefore - tradedReps(before).length))
    : null;
  const remainingAfter = Number.isFinite(nStarAfter)
    ? Math.max(0, Math.ceil(nStarAfter - tradedReps(logReps).length))
    : null;

  const adherenceImproved = adherenceAfter >= adherenceBefore;
  const remainingImproved =
    remainingBefore !== null && remainingAfter !== null ? remainingAfter <= remainingBefore : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="text-[11px] text-muted-foreground">이번 판정</p>
        <p className="text-[13px] leading-relaxed text-foreground">{describeJudgement(current)}</p>
      </div>

      <div>
        <p className="text-[11px] text-muted-foreground">이번으로 달라진 것</p>
        <p className="num text-[13px] leading-relaxed">
          <span className={cn(adherenceImproved ? "text-good" : "text-warn")}>
            계획 지킴 {Math.round(adherenceBefore)}% → {Math.round(adherenceAfter)}%
          </span>
          {remainingBefore !== null && remainingAfter !== null && (
            <>
              <span className="text-muted-foreground"> · </span>
              <span className={cn(remainingImproved ? "text-good" : "text-warn")}>
                결론까지 {remainingBefore}회 → {remainingAfter}회
              </span>
            </>
          )}
        </p>
      </div>

      <div>
        <p className="text-[11px] text-muted-foreground">다음 한 가지</p>
        <p className="text-[13px] leading-relaxed text-foreground">{getFeedback(logReps)}</p>
      </div>
    </div>
  );
}
