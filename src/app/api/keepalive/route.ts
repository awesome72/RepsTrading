import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase 무료 플랜은 일주일 동안 요청이 없으면 프로젝트를 자동 일시정지한다
 * (2026-09-30에 실제로 멈춰서 로그인·서버 기록이 전부 끊겼다).
 * Vercel Cron(vercel.json)이 하루 한 번 이 경로를 불러 DB에 가벼운 조회를 한 번 일으킨다.
 *
 * 익명 키 + 세션 없음이라 RLS 때문에 행은 하나도 안 보이지만, 쿼리 자체는 DB까지 간다 — 그걸로 충분하다.
 * 응답에는 성공 여부만 담는다(데이터·개수 노출 없음).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { error } = await supabase.from("reps").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
