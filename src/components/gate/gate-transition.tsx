import { Button } from "@/components/ui/button";

type GateTransitionProps = {
  kind: "promotion" | "demotion";
  fromLevel: number;
  toLevel: number;
  onClose: () => void;
};

const LEVEL_LABEL: Record<number, string> = { 1: "G1 실행", 2: "G2 판별", 3: "G3 전환" };

/**
 * 단계마다 실제로 무엇이 달라지는지 (차트 구성, 판정 기준) — "조건을 채웠습니다" 같은
 * 뭉뚱그린 안내 대신 이번 전환에서 구체적으로 바뀌는 점을 알려준다.
 */
const TRANSITION_DETAIL: Partial<Record<string, string>> = {
  "1-2":
    "이제부터 눌림목·돌파 셋업과 셋업 없음 차트가 함께 섞여 나옵니다. 내가 고른 셋업만 반복해서 사는 게 아니라, 어떤 셋업인지 스스로 판별해야 합니다.",
  "2-3":
    "차트 구성은 지금과 같이 유지됩니다. 실제 계좌 연동 전 마지막 확인 구간으로, 같은 기준을 유지한 채 100회를 더 쌓으면 됩니다.",
  "2-1":
    "다시 내가 고른 셋업 하나와 셋업 없음 차트만 나오는 구성으로 돌아갑니다. 여러 셋업을 판별하기보다 그 셋업을 정확히 실행하는 데 집중하세요.",
  "3-2":
    "다시 여러 셋업이 섞인 차트로, 셋업 판별 정확도와 평균 R을 기준으로 판정합니다. 차트 구성 자체는 바뀌지 않습니다.",
};

export function GateTransition({ kind, fromLevel, toLevel, onClose }: GateTransitionProps) {
  const isPromotion = kind === "promotion";
  const detail = TRANSITION_DETAIL[`${fromLevel}-${toLevel}`];
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
          ? "조건을 채웠습니다."
          : "최근 준수율이 기준 아래로 2주 넘게 이어졌습니다. 이건 실패가 아니라 재조정입니다 — 다시 기본으로 돌아가 다지는 시간입니다."}
      </p>
      {detail && (
        <p className="max-w-md text-[13px] leading-relaxed text-foreground">{detail}</p>
      )}
      <Button size="lg" className="h-12 px-8 text-[15px] font-bold" onClick={onClose}>
        확인
      </Button>
    </div>
  );
}
