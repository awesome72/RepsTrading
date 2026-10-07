"use client";

import { Analytics } from "@vercel/analytics/next";
import { stripUrlQuery } from "@/lib/analytics/events";

/**
 * Vercel Web Analytics — 쿠키 없이 경로별 방문 수와 퍼널 이벤트(lib/analytics/events.ts)를 센다.
 * 게스트 연습은 서버에 기록이 남지 않아서, 외부 방문자의 흐름을 볼 방법이 이것뿐이다.
 *
 * 보내기 전에 쿼리 문자열·해시를 모두 지운다(stripUrlQuery, 테스트로 보호): 인증 코드나 이메일이
 * URL에 실려 분석 서버로 가는 일을 막는다. 페이지뷰와 커스텀 이벤트 모두 경로만 남는다.
 */
export function WebAnalytics() {
  return <Analytics beforeSend={stripUrlQuery} />;
}
