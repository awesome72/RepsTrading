export type Side = "long" | "short";

/**
 * 손절폭을 1로 놓았을 때의 손익 배수.
 * +2R = 손절폭의 2배를 벌었다는 뜻.
 */
export function rMultiple(
  entry: number,
  exit: number,
  stop: number,
  side: Side = "long"
): number {
  const riskPerShare = Math.abs(entry - stop);
  if (riskPerShare === 0) return 0;
  const raw = (exit - entry) / riskPerShare;
  const signed = side === "long" ? raw : -raw;
  // 부동소수점 잔차(예: 8.6e-15)가 "이익"으로 분류되어 운 좋은 거래로 잡히지 않게 한다 (-0도 0으로)
  return Math.round(signed * 1e6) / 1e6 || 0;
}
