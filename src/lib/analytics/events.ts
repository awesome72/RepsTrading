import { track } from "@vercel/analytics";

/**
 * 방문→체험→온보딩→첫 연습→5회→로그인 퍼널을 보기 위한 이벤트. 이 목록이 보내는 전부다.
 * 게스트는 서버에 기록이 남지 않아서(localStorage만 씀) 이 이벤트가 유일한 관측 수단이다.
 *
 * 개인정보: 속성에는 단계 번호·정오·구간 같은 값만 담는다. 시드·R·가격·이메일·기록 내용은 절대 넣지 않는다.
 * 새 이벤트를 추가할 때도 같은 원칙을 지킬 것(타입이 속성을 문자열/숫자/불린으로 좁혀둔다).
 */
export type FunnelEvent =
  | { name: "try_answer"; props: { correct: boolean } }
  | { name: "onboarding_step"; props: { step: number } }
  | { name: "onboarding_done" }
  | { name: "rep_done"; props: { nth: string; kind: "trade" | "pass" } }
  | { name: "guest_limit_reached" }
  | { name: "login_link_sent" };

type VaWindow = { va?: unknown };

/** 분석 초기화(<Analytics>의 effect) 전에 들어온 이벤트 — 초기화되면 한 번에 비운다 */
const pending: FunnelEvent[] = [];
let drainTimer: ReturnType<typeof setTimeout> | null = null;
/** 초기화를 기다리는 최대 시간. 광고 차단 등으로 끝내 안 뜨면 버린다(쌓아두지 않는다) */
const MAX_WAIT_MS = 5000;
const POLL_MS = 100;

function analyticsReady(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as VaWindow).va === "function";
}

function send(event: FunnelEvent): void {
  try {
    track(event.name, "props" in event ? event.props : undefined);
  } catch {
    // 분석 호출은 어떤 경우에도 화면을 깨뜨리면 안 된다
  }
}

function drainWhenReady(startedAt: number): void {
  drainTimer = null;
  if (analyticsReady()) {
    for (const e of pending.splice(0)) send(e);
    return;
  }
  if (Date.now() - startedAt > MAX_WAIT_MS) {
    pending.length = 0;
    return;
  }
  drainTimer = setTimeout(() => drainWhenReady(startedAt), POLL_MS);
}

/**
 * 이벤트를 보낸다. SDK는 `window.va?.()`로 호출하기 때문에, 초기화 전에 부르면 이벤트가 아무 말 없이 사라진다.
 * 페이지가 처음 뜰 때 자식 컴포넌트의 effect가 레이아웃의 <Analytics> effect보다 먼저 돌아서
 * (마운트 직후에 보내는 이벤트가 실제로 그랬다) 준비 전이면 잠깐 모아 두었다가 보낸다.
 */
export function trackEvent(event: FunnelEvent): void {
  if (typeof window === "undefined") return;
  if (analyticsReady() && pending.length === 0) {
    send(event);
    return;
  }
  pending.push(event);
  if (drainTimer === null) drainTimer = setTimeout(() => drainWhenReady(Date.now()), POLL_MS);
}

/** 테스트용 — 대기열과 타이머를 비운다 */
export function _resetEventQueueForTest(): void {
  pending.length = 0;
  if (drainTimer) clearTimeout(drainTimer);
  drainTimer = null;
}

/** n번째 판단을 구간 문자열로 — 1~5는 그대로(퍼널의 핵심 지점), 그 뒤는 뭉친다 */
export function nthBucket(n: number): string {
  if (n <= 5) return String(Math.max(1, n));
  return n < 20 ? "6-19" : "20+";
}

/**
 * Analytics의 beforeSend에서 쓴다 — 보내기 전에 URL의 쿼리 문자열·해시를 모두 지운다.
 * /auth/callback?code=… 같은 인증 코드나 이메일이 분석 서버로 가는 일을 막는다(경로만 남긴다).
 */
export function stripUrlQuery<T extends { url: string }>(event: T): T {
  const url = new URL(event.url);
  return { ...event, url: url.origin + url.pathname };
}
