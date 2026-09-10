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
  return side === "long" ? raw : -raw;
}
