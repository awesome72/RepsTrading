export type GateLevel = 1 | 2 | 3;

export type GateRequirement = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: "회" | "%" | "R";
  met: boolean;
};

export type GateEvaluation = {
  level: GateLevel;
  requirements: GateRequirement[];
  passed: boolean;
};
