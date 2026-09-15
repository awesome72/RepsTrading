import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rebuildPlan } from "@/lib/rep/server-guard";
import { isGradeAllowed, judgeExecution } from "@/lib/rep/plan-outcome";
import { rMultiple } from "@/lib/metrics/r-multiple";
import { serverRepToRep, type ServerRep } from "@/lib/rep/api";
import { computeHistorySummary } from "@/lib/feedback/summary";
import { DAILY_GOAL } from "@/lib/metrics/progress";
import type { DecisionGrade } from "@/lib/rep/types";

const VALID_GRADES: DecisionGrade[] = ["A", "B", "C", "D"];

/** 결과 계산은 오직 여기, 채점 완료 시점에만 서버에서 일어난다. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { decision_grade } = (await request.json()) as { decision_grade: DecisionGrade };
  if (!VALID_GRADES.includes(decision_grade)) {
    return NextResponse.json({ error: "잘못된 등급입니다." }, { status: 400 });
  }

  const { data: rep, error: fetchError } = await supabase
    .from("reps")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !rep) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }
  if (rep.state !== "EXECUTED") {
    return NextResponse.json(
      { error: `잘못된 상태 전이입니다: ${rep.state} → GRADED` },
      { status: 409 }
    );
  }

  // 실행 기록이 허락하는 것보다 좋은 등급은 받지 않는다 (예: 직접 청산했는데 A)
  const { scenario, plan } = rebuildPlan(rep);
  const verdict = judgeExecution(scenario, plan, {
    exitReason: rep.exit_reason,
    exitIndex: rep.exit_index,
    exitPrice: rep.exit_price,
    // 손절을 옮겼다는 자기 보고는 execute 때 adhered=false로 남아 있다
    stopMoved: rep.adhered === false && rep.exit_reason !== "manual",
  });
  if (!isGradeAllowed(decision_grade, verdict.bestGrade)) {
    return NextResponse.json(
      { error: `실행 기록과 맞지 않는 등급입니다 (가능한 최고 등급: ${verdict.bestGrade}).` },
      { status: 400 }
    );
  }

  const rResult = rMultiple(plan.entryPrice, rep.exit_price, rep.plan_stop);

  // 채점 직후 곧바로 공개한다 (클라이언트 로컬 상태 머신도 이미 grade에서 바로 reveal한다 —
  // 별도의 "결과 보기" 단계가 없으므로 GRADED를 거쳐가는 왕복을 둘 필요가 없다).
  const [{ error: updateError }, { data: beforeRows, error: beforeError }] = await Promise.all([
    supabase
      .from("reps")
      .update({ state: "REVEALED", decision_grade, r_result: rResult })
      .eq("id", id),
    // "이번으로 달라진 것"을 계산하려면 이 rep을 뺀 나머지 기록이 필요하다
    supabase.from("reps").select("*").in("state", ["GRADED", "REVEALED"]).neq("id", id),
  ]);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 결과는 이미 저장됐으니, 델타 조회가 실패해도 채점 자체는 성공으로 응답한다 —
  // 클라이언트가 logReps로 직접 계산하는 예전 경로로 조용히 물러난다.
  const feedback = !beforeError
    ? computeHistorySummary(
        (beforeRows as ServerRep[]).map(serverRepToRep),
        serverRepToRep({ ...(rep as ServerRep), state: "REVEALED", decision_grade, r_result: rResult }),
        DAILY_GOAL
      )
    : undefined;

  return NextResponse.json({ state: "REVEALED", decision_grade, r_result: rResult, feedback });
}
