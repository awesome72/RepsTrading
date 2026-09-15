import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateGate } from "@/lib/gate/rules";
import type { GateLevel } from "@/lib/gate/types";
import { paceEstimate, weeklyComparison } from "@/lib/metrics/progress";
import {
  adherenceRate,
  expectancy,
  gradeDistribution,
  luckyBadTrades,
  requiredSample,
  setupAccuracy,
  tradedReps,
} from "@/lib/metrics/stats";
import { serverRepToRep, type ServerRep } from "@/lib/rep/api";
import type { Rep } from "@/lib/rep/types";

function isGoodJudgment(rep: Rep): boolean {
  return rep.decisionGrade === "A" || rep.decisionGrade === "B";
}

/**
 * /progress가 필요로 하는 숫자를 서버에서 미리 계산해 돌려준다.
 * 전체 rep 행(셋업·계획·시드 등)을 클라이언트로 보내는 대신, 기존 lib/metrics·lib/gate
 * 순수 함수를 그대로 서버에서 호출해 결과 숫자만 보낸다 — 계산 로직은 손대지 않는다.
 * (게스트는 로컬에 최대 5개뿐이라 이 최적화가 필요 없어 이 라우트를 쓰지 않는다.)
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [repsRes, gateRes] = await Promise.all([
    supabase.from("reps").select("*").in("state", ["GRADED", "REVEALED"]),
    supabase.from("gate_progress").select("gate_level").eq("user_id", user.id).maybeSingle(),
  ]);
  if (repsRes.error || gateRes.error) {
    return NextResponse.json({ error: (repsRes.error ?? gateRes.error)!.message }, { status: 500 });
  }

  const gateLevel = (gateRes.data?.gate_level ?? 1) as GateLevel;
  const reps = (repsRes.data as ServerRep[]).map(serverRepToRep);

  const traded = tradedReps(reps);
  const n = traded.length;
  const nStar = requiredSample(reps);
  const grades = gradeDistribution(reps);
  const gateEvaluation = evaluateGate(gateLevel, reps);
  const countReq = gateEvaluation.requirements.find((r) => r.id === "count");
  const pace = countReq ? paceEstimate(reps, countReq.target) : null;

  const curve = traded.reduce<{ i: number; cum: number }[]>((acc, r) => {
    const prevCum = acc.length > 0 ? acc[acc.length - 1].cum : 0;
    const cum = Number((prevCum + (r.result?.rMultiple ?? 0)).toFixed(2));
    acc.push({ i: acc.length + 1, cum });
    return acc;
  }, []);

  const matrix = {
    goodGood: traded.filter((r) => isGoodJudgment(r) && (r.result?.rMultiple ?? 0) > 0).length,
    goodBad: traded.filter((r) => isGoodJudgment(r) && (r.result?.rMultiple ?? 0) <= 0).length,
    badGood: traded.filter((r) => !isGoodJudgment(r) && (r.result?.rMultiple ?? 0) > 0).length,
    badBad: traded.filter((r) => !isGoodJudgment(r) && (r.result?.rMultiple ?? 0) <= 0).length,
  };

  return NextResponse.json({
    n,
    expectancy: expectancy(reps),
    adherence: adherenceRate(reps),
    accuracy: setupAccuracy(reps),
    remaining: Number.isFinite(nStar) ? Math.max(0, Math.ceil(nStar - n)) : null,
    grades,
    lucky: luckyBadTrades(reps),
    curve,
    matrix,
    gateLevel,
    gateEvaluation,
    pace,
    paceTarget: countReq?.target ?? null,
    weekly: weeklyComparison(reps),
  });
}
