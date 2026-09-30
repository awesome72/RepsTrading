import type { MetadataRoute } from "next";

/**
 * 홈 화면에 추가(앱 설치)용 정보. 설치한 앱은 바로 연습 화면으로 열린다 — 매일 연습하러 들어오는 입구.
 * 알림(push)은 넣지 않는다: 연속 기록·재촉은 이 서비스의 원칙과 맞지 않는다.
 * 오프라인 캐시(service worker)도 없다 — 채점·기록은 서버를 거쳐야 의미가 있다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REPS — 연습을 성적표로",
    short_name: "REPS",
    description: "가상 차트로 트레이딩 판단을 연습하고, 결과보다 먼저 스스로 채점하는 훈련 도구",
    lang: "ko",
    start_url: "/practice",
    scope: "/",
    display: "standalone",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
