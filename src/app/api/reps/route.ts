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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("reps")
    .select("*")
    .order("committed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 채점 전 상태는 여기서도 결과 필드를 지운다 — 목록 API도 예외가 아니다.
  const sanitized = (data ?? []).map((rep) => {
    if (rep.state !== "GRADED" && rep.state !== "REVEALED") {
      const payload: Record<string, unknown> = { ...rep };
      delete payload.exit_price;
      delete payload.r_result;
      return payload;
    }
    return rep;
  });

  return NextResponse.json(sanitized);
}
