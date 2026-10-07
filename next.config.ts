import type { NextConfig } from "next";
import { parseSupabaseEnv } from "./src/lib/env";

/**
 * Vercel 프로덕션 빌드에서 Supabase 환경변수가 비었으면 배포를 여기서 멈춘다.
 * 안 그러면 빌드는 통과하고, 배포된 사이트가 모든 요청에서 500을 낸다(미들웨어가 매 요청 Supabase를 만든다).
 * 프로덕션만 검사한다 — 프리뷰·로컬·CI는 값이 없거나 자리표시일 수 있다.
 */
if (process.env.VERCEL_ENV === "production") {
  parseSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/**
 * 모든 응답에 붙는 보안 헤더. 앱 동작을 깨뜨리지 않는 것만 보수적으로 넣었다.
 * script-src까지 제한하는 엄격한 CSP는 Next 인라인 스크립트(nonce 필요)·Supabase·Vercel Analytics와
 * 부딪힐 수 있어 넣지 않았다 — 넣으려면 nonce 기반으로 따로 설계할 것.
 */
const securityHeaders = [
  // 다른 사이트가 REPS를 iframe에 몰래 넣지 못하게 한다(클릭재킹)
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  // 서버가 준 Content-Type을 브라우저가 추측으로 바꾸지 않게
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 외부로 나가는 링크에는 경로·쿼리 없이 출처만 보낸다
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 쓰지 않는 기기 권한은 막아둔다 (진동은 권한 정책 대상이 아니라 영향 없음)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  experimental: {
    // radix-ui 통합 패키지는 import 한 줄에 select·toast·slider 등 쓰지 않는 컴포넌트까지 번들에 딸려왔다
    // (첫 로드 JS에 ~100KB). 실제로 쓰는 것만 가져오게 한다.
    optimizePackageImports: ["radix-ui"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
