/**
 * Supabase 환경변수 읽기·검증. 예전에는 4곳에서 `process.env.X!`로 단정해서, 값이 빠지면
 * "Invalid URL"이나 "supabaseUrl is required" 같은 먼 곳의 오류가 났다. 이제 어떤 변수가 비었는지 말해준다.
 */

export type SupabaseEnv = { url: string; anonKey: string };

/** 값이 있고 올바른 http(s) 주소인지 확인한다 — 순수 함수라 테스트한다 */
export function parseSupabaseEnv(raw: { url?: string; anonKey?: string }): SupabaseEnv {
  const url = raw.url?.trim();
  const anonKey = raw.anonKey?.trim();
  const problems: string[] = [];

  if (!url) problems.push("NEXT_PUBLIC_SUPABASE_URL이 비어 있습니다");
  else {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
    } catch {
      problems.push("NEXT_PUBLIC_SUPABASE_URL이 올바른 주소(https://…)가 아닙니다");
    }
  }
  if (!anonKey) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY가 비어 있습니다");

  if (problems.length > 0) {
    throw new Error(`Supabase 환경변수 오류: ${problems.join(", ")}. .env.local(로컬)이나 Vercel 프로젝트 설정(배포)을 확인하세요.`);
  }
  return { url: url!, anonKey: anonKey! };
}

/**
 * 서버·클라이언트·미들웨어 어디서나 쓴다. `process.env.NEXT_PUBLIC_*`는 빌드 때 값이 글자 그대로
 * 치환되므로 반드시 이렇게 이름을 직접 적어야 한다(process.env[name] 형태는 브라우저에서 비어 버린다).
 */
export function getSupabaseEnv(): SupabaseEnv {
  return parseSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
