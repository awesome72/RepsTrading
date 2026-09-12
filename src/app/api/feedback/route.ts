import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MILESTONES = [5, 20] as const;
type Milestone = (typeof MILESTONES)[number];

/**
 * 결과 화면 한 문항 설문. 5회째·20회째 판단(지나간 것 제외) 이후에만 한 번씩 받는다.
 * 실제로 그만큼 연습했는지는 서버가 reps 테이블로 다시 세어 확인한다 — 클라이언트 값을 믿지 않는다.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { milestone, rating } = (await request.json()) as { milestone: Milestone; rating: number };
  if (!MILESTONES.includes(milestone) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // tradedReps()와 같은 기준(지나간 것 제외)으로 실제 채점 완료 횟수를 센다
  const { count, error: countError } = await supabase
    .from("reps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("state", ["GRADED", "REVEALED"])
    .neq("exit_reason", "pass");
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) < milestone) {
    return NextResponse.json({ error: "아직 이 설문을 받을 시점이 아닙니다." }, { status: 409 });
  }

  const { error } = await supabase
    .from("reveal_surveys")
    .upsert(
      { user_id: user.id, milestone, rating },
      { onConflict: "user_id,milestone", ignoreDuplicates: true }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
