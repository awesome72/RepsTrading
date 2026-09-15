import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCommitHash } from "@/lib/rep/server-guard";
import type { SetupChoice } from "@/lib/rep/types";

const VALID_SETUPS: SetupChoice[] = ["pullback", "breakout", "other"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { scenario_seed, plan_setup, plan_stop, plan_target_r, input_seconds } = body as {
    scenario_seed: number;
    plan_setup: SetupChoice;
    plan_stop: number;
    plan_target_r: number;
    input_seconds: number;
  };

  if (
    typeof scenario_seed !== "number" ||
    !VALID_SETUPS.includes(plan_setup) ||
    typeof plan_stop !== "number" ||
    typeof plan_target_r !== "number"
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const committedAt = new Date().toISOString();
  const commitHash = computeCommitHash({
    userId: user.id,
    scenarioSeed: scenario_seed,
    planSetup: plan_setup,
    planStop: plan_stop,
    planTargetR: plan_target_r,
    committedAt,
  });

  const { data, error } = await supabase
    .from("reps")
    .insert({
      user_id: user.id,
      setup_id: plan_setup,
      scenario_seed,
      state: "COMMITTED",
      committed_at: committedAt,
      commit_hash: commitHash,
      plan_setup,
      plan_stop,
      plan_target_r,
      input_seconds,
    })
    .select("id, state, committed_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const VALID_GRADES = ["A", "B", "C", "D"] as const;

/**
 * /journal이 쓰는 선택적 파라미터: setup·grade는 서버에서 걸러 불필요한 행을 아예 안 받고,
 * traded=1은 지나간 것·아직 채점 안 된 것을 뺀다. limit이 없으면 기존과 완전히 같은
 * "전체를 그대로" 동작이라 useRepLogStore 등 다른 호출부는 그대로 둔다.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const limitParam = params.get("limit");
  const before = params.get("before");
  const setup = params.get("setup");
  const grade = params.get("grade");
  const traded = params.get("traded") === "1";

  const limit = limitParam !== null ? Math.min(Math.max(Number(limitParam), 1), 200) : null;
  if (limitParam !== null && (!Number.isFinite(limit) || limit === null)) {
    return NextResponse.json({ error: "잘못된 limit입니다." }, { status: 400 });
  }
  if (setup && !VALID_SETUPS.includes(setup as SetupChoice)) {
    return NextResponse.json({ error: "잘못된 setup입니다." }, { status: 400 });
  }
  if (grade && !VALID_GRADES.includes(grade as (typeof VALID_GRADES)[number])) {
    return NextResponse.json({ error: "잘못된 grade입니다." }, { status: 400 });
  }

  let query = supabase.from("reps").select("*").order("committed_at", { ascending: false });
  if (before) query = query.lt("committed_at", before);
  if (setup) query = query.eq("plan_setup", setup);
  if (grade) query = query.eq("decision_grade", grade);
  if (traded) query = query.neq("exit_reason", "pass").not("r_result", "is", null);
  // hasMore 판정을 위해 하나 더 받아온다
  if (limit !== null) query = query.limit(limit + 1);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasMore = limit !== null && (data?.length ?? 0) > limit;
  const rows = limit !== null ? (data ?? []).slice(0, limit) : (data ?? []);

  // 채점 전 상태는 여기서도 결과 필드를 지운다 — 목록 API도 예외가 아니다.
  const sanitized = rows.map((rep) => {
    if (rep.state !== "GRADED" && rep.state !== "REVEALED") {
      const payload: Record<string, unknown> = { ...rep };
      delete payload.exit_price;
      delete payload.r_result;
      return payload;
    }
    return rep;
  });

  return NextResponse.json(limit !== null ? { reps: sanitized, hasMore } : sanitized);
}
