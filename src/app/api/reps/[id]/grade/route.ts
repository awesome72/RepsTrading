import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deriveEntryPrice } from "@/lib/rep/server-guard";
import { rMultiple } from "@/lib/metrics/r-multiple";
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

  const entryPrice = deriveEntryPrice(rep.scenario_seed);
  const rResult = rMultiple(entryPrice, rep.exit_price, rep.plan_stop);

  const { error: updateError } = await supabase
    .from("reps")
    .update({ state: "GRADED", decision_grade, r_result: rResult })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ state: "GRADED", decision_grade, r_result: rResult });
}
