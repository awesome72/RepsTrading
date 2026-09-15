import { cn } from "@/lib/utils";
import { computeHistorySummary, type HistorySummary } from "@/lib/feedback/summary";
import { DAILY_GOAL } from "@/lib/metrics/progress";
import { useRepLogStore } from "@/lib/rep/log-store";
import { useAccountStore } from "@/lib/account/store";
import { GATE_LABEL, gateCountTarget } from "@/lib/gate/rules";
import type { GateLevel } from "@/lib/gate/types";
import type { Rep } from "@/lib/rep/types";

/** 이번 한 번으로 게이트 누적 횟수가 한 칸 찼다는 걸 결과 화면에서 바로 보여준다 */
function GateTick({ level, tradedAfter }: { level: GateLevel; tradedAfter: number }) {
  const target = gateCountTarget(level);
  const reached = tradedAfter >= target;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <p className="num text-[12px] text-muted-foreground">
        {GATE_LABEL[level]} 누적{" "}
        <span className="font-semibold text-foreground">
          {tradedAfter - 1} → {tradedAfter}
        </span>{" "}
        / {target}회{reached && <span className="text-good"> · 목표 횟수 도달</span>}
      </p>
      <div className="h-1.5 w-full rounded-full bg-surface-2" aria-hidden>
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, (tradedAfter / target) * 100)}%` }}
        />
      </div>
    </div>
  );
}

type ImmediateFeedbackProps = {
  /** 방금 끝난 판단 */
  current: Rep;
  /**
   * 게스트일 때만 필요하다 — 방금 끝난 rep까지 포함된 전체 기록(마지막 원소가 current)에서
   * 직접 계산한다. 로그인 사용자는 summary가 항상 있으므로 이 값은 안 쓰인다.
   */
  logReps?: Rep[];
  /** 로그인 사용자: 채점·지나가기 API가 이미 계산해 보내준 값 — 있으면 이걸 그대로 쓴다 */
  summary?: HistorySummary;
};

function describeJudgement(rep: Rep): string {
  const r = rep.result?.rMultiple ?? 0;
  switch (rep.decisionGrade) {
    case "A":
      return r < 0
        ? "계획대로 손절했습니다. 손실이지만 잘한 거래입니다."
        : "계획대로 목표까지 지켰습니다. 잘한 거래입니다.";
    case "B":
      return "계획은 지켰지만 판단 근거가 약했습니다. 다음엔 셋업과 손절 근거부터 확인하고 사세요.";
    case "C":
      return "계획보다 먼저 팔았습니다. 손실 한도는 넘지 않았지만, 정한 청산 지점을 믿어보세요.";
    case "D":
      return "손절을 내리거나 무시했습니다. 손실 한도를 지키지 못한 거래입니다.";
    default:
      return "이번 판단이 기록되었습니다.";
  }
}

export function ImmediateFeedback({ current, logReps, summary }: ImmediateFeedbackProps) {
  // 게스트는 5회 한도라 하루 목표(10회)를 쓰지 않는다
  const guest = useRepLogStore((s) => s.mode === "guest");
  const gateLevel = useAccountStore((s) => s.gateLevel);
  const gateSynced = useAccountStore((s) => s.serverSynced);
  // 지나간 판단은 "정답 셋업" 여부를 RevealPanel이 이미 별도 박스로 보여준다 —
  // 여기서 등급(A~D) 기준 문구를 또 보여주면 어긋난 소리를 하게 된다 (지나가기는 서버가 등급을 항상 A로 저장한다).
  const isPass = current.exitReason === "pass";

  const computed = summary ?? computeHistorySummary(logReps?.slice(0, -1) ?? [], current, guest ? null : DAILY_GOAL);

  const adherenceBefore = computed.adherenceBefore * 100;
  const adherenceAfter = computed.adherenceAfter * 100;
  const { remainingBefore, remainingAfter } = computed;

  // 게이트는 로그인 사용자에게만 있고, 지나간 판단은 누적 횟수에 들어가지 않는다
  const showGateTick = !guest && !isPass && gateSynced;

  const adherenceImproved = adherenceAfter >= adherenceBefore;
  const remainingImproved =
    remainingBefore !== null && remainingAfter !== null ? remainingAfter <= remainingBefore : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {!isPass && (
        <div>
          <p className="text-[11px] text-muted-foreground">이번 판정</p>
          <p className="text-[13px] leading-relaxed text-foreground">{describeJudgement(current)}</p>
        </div>
      )}

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
        {showGateTick && <GateTick level={gateLevel} tradedAfter={computed.tradedAfter} />}
      </div>

      <div>
        <p className="text-[11px] text-muted-foreground">다음 한 가지</p>
        <p className="text-[13px] leading-relaxed text-foreground">{computed.message}</p>
      </div>
    </div>
  );
}
