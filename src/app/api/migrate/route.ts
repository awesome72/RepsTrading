import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toMigrationRow, type MigrationRow } from "@/lib/rep/migration";
import type { Rep } from "@/lib/rep/types";

const MAX_REPS_PER_REQUEST = 2000;

/**
 * 브라우저에만 있던 연습 기록(게스트 연습·예전 로컬 기록)을 서버로 옮긴다.
 * 결과·준수 여부·등급은 서버가 seed와 청산 기록으로 다시 계산하고, 검증에 실패한 기록은 건너뛴다.
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
  if (reps.length > MAX_REPS_PER_REQUEST) {
    return NextResponse.json({ error: "한 번에 옮길 수 있는 기록 수를 넘었습니다." }, { status: 413 });
  }

  const rows = reps
    .map((r) => {
      try {
        return toMigrationRow(r, user.id);
      } catch {
        return null;
      }
    })
    .filter((row): row is MigrationRow => row !== null);

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
