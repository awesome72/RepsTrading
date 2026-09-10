export type GateLevel = 1 | 2 | 3;

export type GateRequirement = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: "회" | "%" | "R";
  met: boolean;
  /** 이 기준이 왜 이 숫자인지에 대한 짧은 설명 */
  reason?: string;
};

export type GateEvaluation = {
  level: GateLevel;
  requirements: GateRequirement[];
  passed: boolean;
};
