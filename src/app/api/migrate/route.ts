import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCommitHash } from "@/lib/rep/server-guard";
import type { Rep } from "@/lib/rep/types";

/**
 * localStorage에 있던 기존 연습 기록을 서버로 옮긴다.
 * (user_id, scenario_seed, committed_at) unique 제약 + upsert로 재시도해도 중복이 생기지 않는다.
 * 실패해도 로컬 데이터는 절대 지우지 않는다 — 그건 호출하는 쪽(클라이언트)의 책임이다.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { reps } = (await request.json()) as { reps: Rep[] };
  if (!Array.isArray(reps) || reps.length === 0) {
    return NextResponse.json({ migrated: 0, skipped: 0 });
  }

  const rows = reps
    .filter((r) => r.plan && r.result && r.committedAt)
    .map((r) => {
      const committedAt = new Date(r.committedAt!).toISOString();
      return {
        user_id: user.id,
        setup_id: r.plan!.setupChoice,
        scenario_seed: r.seed,
        state: "REVEALED" as const,
        committed_at: committedAt,
        commit_hash: computeCommitHash({
          userId: user.id,
          scenarioSeed: r.seed,
          planSetup: r.plan!.setupChoice,
          planStop: r.plan!.stopPrice,
          planTargetR: r.plan!.targetR,
          committedAt,
        }),
        plan_setup: r.plan!.setupChoice,
        plan_stop: r.plan!.stopPrice,
        plan_target_r: r.plan!.targetR,
        exit_price: r.result!.exitPrice,
        exit_reason: r.exitReason ?? null,
        exit_index: r.exitIndex ?? null,
        adhered: r.adhered ?? null,
        decision_grade: r.decisionGrade ?? null,
        r_result: r.result!.rMultiple,
        input_seconds: r.inputSeconds ?? null,
      };
    });

  if (rows.length === 0) {
    return NextResponse.json({ migrated: 0, skipped: reps.length });
  }

  const { error, count } = await supabase
    .from("reps")
    .upsert(rows, {
      onConflict: "user_id,scenario_seed,committed_at",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (error) {
    return NextResponse.json(
      { error: error.message, migrated: 0, skipped: reps.length },
      { status: 500 }
    );
  }

  return NextResponse.json({ migrated: count ?? rows.length, skipped: reps.length - rows.length });
}
