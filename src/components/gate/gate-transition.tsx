import { Button } from "@/components/ui/button";

type GateTransitionProps = {
  kind: "promotion" | "demotion";
  fromLevel: number;
  toLevel: number;
  onClose: () => void;
};

const LEVEL_LABEL: Record<number, string> = { 1: "G1 실행", 2: "G2 판별", 3: "G3 전환" };

export function GateTransition({ kind, fromLevel, toLevel, onClose }: GateTransitionProps) {
  const isPromotion = kind === "promotion";
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <p className="text-[13px] font-semibold text-muted-foreground">
        {LEVEL_LABEL[fromLevel]} → {LEVEL_LABEL[toLevel]}
      </p>
      <h1 className="max-w-md text-[26px] font-bold leading-snug text-foreground">
        {isPromotion
          ? `${LEVEL_LABEL[toLevel]} 단계로 올라갑니다.`
          : `${LEVEL_LABEL[toLevel]} 단계로 재조정합니다.`}
      </h1>
      <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
        {isPromotion
          ? "조건을 채웠습니다. 다음 단계 조건은 진척 화면에서 미리 볼 수 있습니다."
          : "최근 준수율이 기준 아래로 2주 넘게 이어졌습니다. 이건 실패가 아니라 재조정입니다 — 다시 기본으로 돌아가 다지는 시간입니다."}
      </p>
      <Button size="lg" className="h-12 px-8 text-[15px] font-bold" onClick={onClose}>
        확인
      </Button>
    </div>
  );
}
