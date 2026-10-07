import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import { checkSchema, type SchemaProbeClient } from "@/lib/health/schema-check";

/**
 * 두 가지를 한 번에 한다.
 * 1) Supabase 무료 플랜은 일주일 동안 요청이 없으면 프로젝트를 자동 일시정지한다(2026-09-30에 실제로 멈춰서
 *    로그인·서버 기록이 전부 끊겼다). Vercel Cron(vercel.json)이 하루 한 번 이 경로를 불러 DB를 깨워둔다.
 * 2) 코드가 기대하는 테이블·컬럼이 실제 DB에 있는지 점검한다(lib/health/schema-check.ts). DDL은 손으로 적용해서
 *    "코드만 배포되고 DDL이 빠진" 상태가 생길 수 있다 — 어긋나면 502로 응답하고, 매일 도는
 *    .github/workflows/keepalive-check.yml이 GitHub 이슈를 열어 알려준다.
 *
 * 익명 키 + 세션 없음이라 RLS 때문에 행은 하나도 안 보인다(쿼리는 DB까지 간다 — 깨우는 데는 그걸로 충분하다).
 * 응답에는 원인 분류(reason)만 담는다. 어느 테이블·컬럼인지는 서버 로그에만 남기고 밖에 내보내지 않는다.
 */
export const dynamic = "force-dynamic";

/** 공개 경로라 누가 연타해도 DB가 일하지 않게, 결과를 잠깐 기억한다(서버 인스턴스별) */
const CACHE_MS = 60_000;
let cached: { at: number; ok: boolean; reason?: "env" | "db" | "schema" } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) return respond(cached);

  let result: NonNullable<typeof cached>;
  try {
    const { url, anonKey } = getSupabaseEnv();
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    // 연결 자체가 되는지부터 — 안 되면 스키마 점검은 의미가 없다
    const ping = await supabase.from("reps").select("id").limit(1);
    if (ping.error) {
      console.error("[keepalive] db unreachable or table missing:", ping.error.message);
      result = { at: Date.now(), ok: false, reason: "db" };
    } else {
      const issues = await checkSchema(supabase as unknown as SchemaProbeClient);
      if (issues.length > 0) {
        for (const i of issues) console.error(`[keepalive] schema mismatch: ${i.table}: ${i.detail}`);
        result = { at: Date.now(), ok: false, reason: "schema" };
      } else {
        result = { at: Date.now(), ok: true };
      }
    }
  } catch (e) {
    console.error("[keepalive] failed:", e instanceof Error ? e.message : e);
    result = { at: Date.now(), ok: false, reason: "env" };
  }

  // 실패는 기억하지 않는다 — 고친 직후 다시 확인했을 때 바로 풀려 보이도록
  cached = result.ok ? result : null;
  return respond(result);
}

function respond(r: NonNullable<typeof cached>) {
  return r.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, reason: r.reason }, { status: 502 });
}
