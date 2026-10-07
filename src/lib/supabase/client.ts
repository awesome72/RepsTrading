import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * 브라우저용 Supabase 클라이언트 — 처음 필요할 때 불러온다.
 * supabase-js(인증·실시간·스토리지·쿼리 모듈)는 압축 전 ~230KB라, 정적으로 import하면 모든 페이지의
 * 첫 JS에 실린다. 브라우저에서는 로그인 상태 확인·로그인·로그아웃에만 쓰고(데이터는 /api 라우트를 거친다)
 * 셋 다 화면이 뜬 뒤에 필요하므로, 동적 import로 첫 화면 경로에서 뺀다. 한 번 만든 클라이언트는 재사용한다.
 */
export function getBrowserClient(): Promise<SupabaseClient> {
  clientPromise ??= import("@supabase/ssr").then(({ createBrowserClient }) => {
    const { url, anonKey } = getSupabaseEnv();
    return createBrowserClient(url, anonKey);
  });
  return clientPromise;
}

/**
 * 로그인 세션 쿠키가 있는지. @supabase/ssr은 세션을 `sb-<project-ref>-auth-token`(길면 `.0`, `.1`…로
 * 나뉨) 쿠키에 저장하고, 브라우저 클라이언트가 읽어야 하므로 httpOnly가 아니다.
 * 이 쿠키가 없으면 로그인 상태일 수 없다 — 게스트(모든 신규 방문자)는 Supabase를 아예 받지 않아도 된다.
 */
export function hasSessionCookie(cookie: string): boolean {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=[^;]/.test(cookie);
}
