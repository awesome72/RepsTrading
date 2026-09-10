import { create } from "zustand";
import type { SetupLabel } from "@/lib/market/scenario";
import * as machine from "./machine";
import type { DecisionGrade, ExitReason, Plan, Rep } from "./types";

type RepStore = {
  rep: Rep | null;
  startWatching: (params: {
    scenarioId: string;
    seed: number;
    setupLabel: SetupLabel;
  }) => void;
  commit: (plan: Plan) => void;
  execute: (params: {
    exitPrice: number;
    exitReason: ExitReason;
    exitIndex: number;
    adhered: boolean;
  }) => void;
  grade: (decisionGrade: DecisionGrade) => void;
  pass: (price: number) => void;
  reset: () => void;
};

export const useRepStore = create<RepStore>((set, get) => ({
  rep: null,

  startWatching: ({ scenarioId, seed, setupLabel }) => {
    set({
      rep: machine.createRep({ scenarioId, seed, setupLabel, openedAt: Date.now() }),
    });
  },

  commit: (plan) => {
    const rep = get().rep;
    if (!rep) return;
    set({ rep: machine.commitPlan(rep, plan, Date.now()) });
  },

  execute: (params) => {
    const rep = get().rep;
    if (!rep) return;
    set({ rep: machine.executeExit(rep, params) });
  },

  grade: (decisionGrade) => {
    const rep = get().rep;
    if (!rep) return;
    // 채점이 끝나면 곧바로 공개한다 — 별도의 "결과 보기" 버튼은 없다.
    const graded = machine.gradeDecision(rep, decisionGrade);
    set({ rep: machine.reveal(graded) });
  },

  pass: (price) => {
    const rep = get().rep;
    if (!rep) return;
    set({ rep: machine.passRep(rep, { price, now: Date.now() }) });
  },

  reset: () => set({ rep: null }),
}));
