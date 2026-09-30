"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics — 쿠키 없이 경로별 방문 수만 센다(랜딩 → 온보딩 → 연습 → 로그인 이탈 확인용).
 * 게스트 연습은 서버에 기록이 남지 않아서, 외부 방문자의 흐름을 볼 방법이 이것뿐이다.
 *
 * 보내기 전에 쿼리 문자열·해시를 모두 지운다: /auth/callback?code=… 같은 인증 코드나
 * 이메일이 URL에 실려 분석 서버로 가는 일을 막는다. 경로만 남긴다.
 */
function stripQuery(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  return { ...event, url: url.origin + url.pathname };
}

export function WebAnalytics() {
  return <Analytics beforeSend={stripQuery} />;
}
