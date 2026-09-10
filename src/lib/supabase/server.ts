import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 라우트 핸들러/서버 컴포넌트용 — 요청자의 세션 쿠키로 인증되므로 RLS가 그대로 적용된다 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출되면 쓰기가 막힌다 — middleware가 세션 갱신을 담당하므로 무시한다.
          }
        },
      },
    }
  );
}
