import type { ChartPriceLine } from "@/components/blind-chart";
import type { Rep } from "@/lib/rep/types";

/** 연습 화면 상단 안내 문구 */
export function practiceTopText(rep: Rep, showForm: boolean): string {
  const passRevealed = rep.exitReason === "pass" && rep.state === "REVEALED";
  if (showForm) return "사기 전에 계획을 적으세요.";
  if (rep.state === "COMMITTED") return "계획대로 진행되는지 지켜보세요.";
  if (passRevealed) return "지나간 뒤 이렇게 움직였습니다.";
  return "이 차트를 보고 판단하세요.";
}

/** 상태별 단축키 힌트. showOverlay는 EXECUTED/GRADED/REVEALED 오버레이가 떠 있는지 */
export function practiceHint(rep: Rep, showForm: boolean, showOverlay: boolean): string {
  if (rep.state === "WATCHING" && !showForm) return "단축키: B 산다 · S 지나간다";
  if (rep.state === "WATCHING" && showForm) return "단축키: 1/2/3 셋업 선택 · Enter 저장";
  if (rep.state === "COMMITTED") return "단축키: Space 지금 판다";
  if (showOverlay && rep.state === "EXECUTED") return "단축키: Y 예 · N 아니오 · Enter 확인";
  return "단축키: Enter 다음";
}

/** 재생 중 차트에 그릴 계획선 — 결과를 미리 알려주지 않도록 계획 자체만 표시한다 */
export function practiceReplayLines(rep: Rep): ChartPriceLine[] | undefined {
  if (rep.state !== "COMMITTED" || !rep.plan) return undefined;
  return [
    { price: rep.plan.targetPrice, label: "목표", tone: "up" },
    { price: rep.plan.entryPrice, label: "진입", tone: "neutral" },
    {
      price: rep.movedStopPrice ?? rep.plan.stopPrice,
      label: rep.movedStopPrice !== undefined ? "내린 손절" : "손절",
      tone: "down",
    },
  ];
}

/** 청산 후 결과 오버레이(채점/공개)를 보여줄지 — "지나감"은 결과를 잠글 게 없어 제외한다 */
export function practiceShowOverlay(rep: Rep): boolean {
  return rep.exitReason !== "pass" && (rep.state === "EXECUTED" || rep.state === "GRADED" || rep.state === "REVEALED");
}

/** 지나가기는 결과를 잠글 게 없으므로 결정 직후 이후 움직임을 바로 펼쳐 보여준다 */
export function practicePassRevealed(rep: Rep): boolean {
  return rep.exitReason === "pass" && rep.state === "REVEALED";
}
