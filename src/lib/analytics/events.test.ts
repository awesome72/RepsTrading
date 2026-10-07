import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import { track } from "@vercel/analytics";
import { _resetEventQueueForTest, nthBucket, stripUrlQuery, trackEvent } from "./events";

type VaWindow = { va?: unknown };
const win = window as unknown as VaWindow;

// 중괄호로 감싸 값을 반환하지 않는다 — beforeEach가 함수를 반환하면 Vitest가 그걸 테스트 뒤 정리 콜백으로 호출한다
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(track).mockReset();
  _resetEventQueueForTest();
  win.va = () => {};
});

afterEach(() => {
  _resetEventQueueForTest();
  delete win.va;
  vi.useRealTimers();
});

describe("trackEvent — 분석이 준비된 뒤", () => {
  it("속성이 있는 이벤트는 이름과 속성을 그대로 넘긴다", () => {
    trackEvent({ name: "try_answer", props: { correct: true } });
    expect(track).toHaveBeenCalledWith("try_answer", { correct: true });
  });

  it("속성이 없는 이벤트는 속성 인자를 비운다", () => {
    trackEvent({ name: "login_link_sent" });
    expect(track).toHaveBeenCalledWith("login_link_sent", undefined);
  });

  it("분석 쪽이 던져도 호출한 화면은 영향이 없다", () => {
    vi.mocked(track).mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => trackEvent({ name: "onboarding_done" })).not.toThrow();
  });
});

describe("trackEvent — 분석 초기화 전에 불린 경우 (SDK는 window.va가 없으면 이벤트를 조용히 버린다)", () => {
  it("초기화 전에는 보내지 않고, 초기화되면 보낸다", () => {
    delete win.va;
    trackEvent({ name: "guest_limit_reached" });
    expect(track).not.toHaveBeenCalled();

    win.va = () => {};
    vi.advanceTimersByTime(150);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("guest_limit_reached", undefined);
  });

  it("기다리는 동안 쌓인 이벤트는 들어온 순서대로 한 번씩만 나간다", () => {
    delete win.va;
    trackEvent({ name: "onboarding_step", props: { step: 1 } });
    trackEvent({ name: "try_answer", props: { correct: false } });
    win.va = () => {};
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(1000);
    expect(vi.mocked(track).mock.calls.map((c) => c[0])).toEqual(["onboarding_step", "try_answer"]);
  });

  it("대기열이 남아 있으면 새 이벤트도 그 뒤에 선다 (순서가 뒤집히지 않는다)", () => {
    delete win.va;
    trackEvent({ name: "onboarding_step", props: { step: 1 } });
    win.va = () => {};
    trackEvent({ name: "onboarding_step", props: { step: 2 } });
    vi.advanceTimersByTime(150);
    expect(vi.mocked(track).mock.calls.map((c) => (c[1] as { step: number }).step)).toEqual([1, 2]);
  });

  it("5초가 지나도 초기화되지 않으면(광고 차단 등) 버리고, 쌓아두지 않는다", () => {
    delete win.va;
    trackEvent({ name: "login_link_sent" });
    vi.advanceTimersByTime(6000);
    win.va = () => {};
    vi.advanceTimersByTime(1000);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("nthBucket", () => {
  it("1~5는 그대로", () => {
    expect([1, 2, 3, 4, 5].map(nthBucket)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("6~19는 한 구간, 20 이상은 한 구간", () => {
    expect(nthBucket(6)).toBe("6-19");
    expect(nthBucket(19)).toBe("6-19");
    expect(nthBucket(20)).toBe("20+");
    expect(nthBucket(300)).toBe("20+");
  });

  it("0 이하도 1로 올려 잘못된 값이 나가지 않는다", () => {
    expect(nthBucket(0)).toBe("1");
    expect(nthBucket(-3)).toBe("1");
  });
});

describe("stripUrlQuery — 인증 코드·이메일이 분석 서버로 가지 않게", () => {
  it("쿼리 문자열과 해시를 지우고 경로만 남긴다", () => {
    const out = stripUrlQuery({
      type: "pageview",
      url: "https://reps-trading.vercel.app/auth/callback?code=SECRET&email=a@b.c#frag",
    });
    expect(out.url).toBe("https://reps-trading.vercel.app/auth/callback");
    expect(JSON.stringify(out)).not.toContain("SECRET");
    expect(JSON.stringify(out)).not.toContain("a@b.c");
  });

  it("UTM 같은 일반 쿼리도 지운다 (허용하려면 오너 승인 후 이 테스트를 바꿀 것)", () => {
    expect(stripUrlQuery({ url: "https://x.app/?utm_source=blog" }).url).toBe("https://x.app/");
  });

  it("다른 필드는 건드리지 않고, 입력 객체도 바꾸지 않는다", () => {
    const input = { type: "event", url: "https://x.app/a?b=1", extra: 7 };
    const out = stripUrlQuery(input);
    expect(out.extra).toBe(7);
    expect(input.url).toBe("https://x.app/a?b=1");
  });
});
