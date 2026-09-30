import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripUngradedResult } from "@/lib/rep/result-lock";

/**
 * 결과 잠금의 서버 강제 지점.
 * GRADED/REVEALED가 아니면 응답에서 결과·정답 필드를 아예 지운다(lib/rep/result-lock.ts)
 * — 프론트에서 숨기는 게 아니라 서버가 보내지 않는다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: rep, error } = await supabase.from("reps").select("*").eq("id", id).single();
  if (error || !rep) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(stripUngradedResult(rep));
}
