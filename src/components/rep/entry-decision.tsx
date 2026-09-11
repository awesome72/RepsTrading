import { Button } from "@/components/ui/button";
import { Term } from "@/components/term";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";

type EntryDecisionProps = {
  onEnter: () => void;
  onPass: () => void;
  /** 1단계에서 반복할 셋업 — 온보딩에서 고른 값. 판별 단계(2단계~)에서는 넘기지 않는다 */
  focusSetup?: "pullback" | "breakout";
};

export function EntryDecision({ onEnter, onPass, focusSetup }: EntryDecisionProps) {
  useHotkeys({ b: onEnter, s: onPass });

  return (
    <div className="flex flex-col gap-3">
      {focusSetup && (
        <p className="rounded-md border border-border bg-surface-2/50 px-3 py-2 text-[12px] leading-snug text-muted-foreground">
          당신의 셋업:{" "}
          {focusSetup === "pullback" ? (
            <Term id="nul-lim-mok">눌림목</Term>
          ) : (
            <Term id="dol-pa">돌파</Term>
          )}{" "}
          — 1단계에서는 이 모양과 셋업이 없는 차트만 나옵니다. 이 모양이 아니면 지나가세요.
        </p>
      )}
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        지금 이 가격에서 사시겠습니까?
      </p>
      <Button size="lg" className="h-14 w-full text-[15px] font-bold" onClick={onEnter}>
        여기서 산다 <span className="ml-1.5 text-[11px] font-normal opacity-60">B</span>
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-14 w-full text-[15px] font-bold"
        onClick={onPass}
      >
        지나간다 <span className="ml-1.5 text-[11px] font-normal opacity-60">S</span>
      </Button>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        아무것도 안 하는 것도 판단입니다. 셋업이 아닌 구간에서 지나가는 것이 정답일 때도
        있습니다.
      </p>
    </div>
  );
}
