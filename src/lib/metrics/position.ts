export type PositionSize = {
  /** 한 번에 잃어도 되는 금액 = 1R (계좌 × 위험 비율) */
  riskAmount: number;
  /** 1R을 지키면서 살 수 있는 수량 */
  shares: number;
  /** 계좌 금액이 모자라 1R 기준 수량보다 적게 사야 하는가 */
  cappedByAccount: boolean;
  /** 실제로 손절됐을 때 잃는 금액 (수량을 정수로 내리므로 1R보다 약간 작다) */
  lossAtStop: number;
};

/**
 * 손절폭이 넓으면 적게, 좁으면 많이 사서 손절 시 손실을 항상 1R로 맞춘다.
 * 계좌 금액보다 많이 살 수는 없으므로 그 경우 수량을 계좌 한도로 자른다.
 */
export function positionSize(params: {
  accountSize: number;
  riskPercent: number;
  entryPrice: number;
  stopPrice: number;
}): PositionSize | null {
  const { accountSize, riskPercent, entryPrice, stopPrice } = params;
  const riskPerShare = entryPrice - stopPrice;
  if (!(accountSize > 0) || !(riskPercent > 0) || !(entryPrice > 0) || !(riskPerShare > 0)) return null;

  const riskAmount = (accountSize * riskPercent) / 100;
  const byRisk = Math.floor(riskAmount / riskPerShare);
  const byAccount = Math.floor(accountSize / entryPrice);
  const shares = Math.min(byRisk, byAccount);
  return {
    riskAmount,
    shares,
    cappedByAccount: byAccount < byRisk,
    lossAtStop: shares * riskPerShare,
  };
}
