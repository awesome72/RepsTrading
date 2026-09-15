import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCommitHash, deriveEntryPrice } from "@/lib/rep/server-guard";
import { serverRepToRep, type ServerRep } from "@/lib/rep/api";
import { computeHistorySummary } from "@/lib/feedback/summary";
import { DAILY_GOAL } from "@/lib/metrics/progress";

/**
 * "지나간다" 기록. R이 항상 0이라 잠글 결과가 없으므로 곧장 REVEALED로 한 번에 저장한다.
 * 계획 값은 lib/rep/machine.ts의 passRep과 같은 규칙(기타 · 손절=진입가 · 0R)을 따른다.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { scenario_seed, input_seconds } = (await request.json()) as {
    scenario_seed: number;
    input_seconds?: number;
  };
  if (typeof scenario_seed !== "number" || !Number.isFinite(scenario_seed)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const entryPrice = deriveEntryPrice(scenario_seed);
  const committedAt = new Date().toISOString();

  const [{ data, error }, { data: beforeRows, error: beforeError }] = await Promise.all([
    supabase
      .from("reps")
      .insert({
        user_id: user.id,
        setup_id: "other",
        scenario_seed,
        state: "REVEALED",
        committed_at: committedAt,
        commit_hash: computeCommitHash({
          userId: user.id,
          scenarioSeed: scenario_seed,
          planSetup: "other",
          planStop: entryPrice,
          planTargetR: 0,
          committedAt,
        }),
        plan_setup: "other",
        plan_stop: entryPrice,
        plan_target_r: 0,
        exit_price: entryPrice,
        exit_reason: "pass",
        exit_index: 0,
        adhered: true,
        decision_grade: "A",
        r_result: 0,
        input_seconds: typeof input_seconds === "number" ? input_seconds : null,
      })
      .select("*")
      .single(),
    // "이번으로 달라진 것"을 계산하려면 이 rep을 만들기 전 기록이 필요하다
    supabase.from("reps").select("*").in("state", ["GRADED", "REVEALED"]),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 결과는 이미 저장됐으니, 델타 조회가 실패해도 지나가기 자체는 성공으로 응답한다.
  const feedback = !beforeError
    ? computeHistorySummary(
        (beforeRows as ServerRep[]).map(serverRepToRep),
        serverRepToRep(data as ServerRep),
        DAILY_GOAL
      )
    : undefined;

  return NextResponse.json({ ...data, feedback });
}
