import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";

type EntryDecisionProps = {
  onEnter: () => void;
  onPass: () => void;
};

export function EntryDecision({ onEnter, onPass }: EntryDecisionProps) {
  useHotkeys({ b: onEnter, s: onPass });

  return (
    <div className="flex flex-col gap-3">
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
