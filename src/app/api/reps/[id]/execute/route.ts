import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rebuildPlan, validateExit } from "@/lib/rep/server-guard";
import { judgeExecution } from "@/lib/rep/plan-outcome";
import type { ExitReason } from "@/lib/rep/types";

const VALID_EXITS: ExitReason[] = ["stop", "target", "manual", "timeout"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { exit_price, exit_reason, exit_index, stop_moved } = body as {
    exit_price: number;
    exit_reason: ExitReason;
    exit_index: number;
    stop_moved?: boolean;
  };
  if (
    !VALID_EXITS.includes(exit_reason) ||
    typeof exit_price !== "number" ||
    typeof exit_index !== "number"
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const stopMoved = stop_moved === true;

  const { data: rep, error: fetchError } = await supabase
    .from("reps")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !rep) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }
  if (rep.state !== "COMMITTED") {
    return NextResponse.json(
      { error: `잘못된 상태 전이입니다: ${rep.state} → EXECUTED` },
      { status: 409 }
    );
  }

  const validation = validateExit({
    scenarioSeed: rep.scenario_seed,
    planStop: rep.plan_stop,
    planTargetR: rep.plan_target_r,
    exitReason: exit_reason,
    exitPrice: exit_price,
    exitIndex: exit_index,
    stopMoved,
  });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  // 계획을 지켰는지는 클라이언트가 보낸 값이 아니라 실행 기록으로 서버가 판정한다
  const { scenario, plan } = rebuildPlan(rep);
  const verdict = judgeExecution(scenario, plan, {
    exitReason: exit_reason,
    exitIndex: exit_index,
    exitPrice: exit_price,
    stopMoved,
  });

  const { error: updateError } = await supabase
    .from("reps")
    .update({ state: "EXECUTED", exit_price, exit_reason, exit_index, adhered: verdict.adhered })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 결과는 아직 계산하지 않는다 — GRADED 전까지 exit_price/r_result는 응답에 없다.
  return NextResponse.json({ state: "EXECUTED" });
}
