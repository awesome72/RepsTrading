"use client";

import { useEffect } from "react";
import { trackEvent, type FunnelEvent } from "@/lib/analytics/events";

/** 화면이 뜨는 순간 이벤트를 한 번 보낸다 — JSX 안에 한 줄로 둔다 */
export function TrackOnMount({ event }: { event: FunnelEvent }) {
  useEffect(() => {
    trackEvent(event);
    // 마운트당 한 번만 — 이벤트 객체는 매 렌더 새로 만들어지므로 의존성에 넣지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
