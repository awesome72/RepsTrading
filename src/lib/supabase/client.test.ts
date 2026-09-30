import { describe, expect, it } from "vitest";
import { hasSessionCookie } from "./client";

describe("hasSessionCookie", () => {
  it("쿠키가 없으면 false", () => {
    expect(hasSessionCookie("")).toBe(false);
  });

  it("다른 쿠키만 있으면 false", () => {
    expect(hasSessionCookie("theme=dark; _ga=GA1.2.3")).toBe(false);
  });

  it("세션 쿠키가 있으면 true (맨 앞·중간 모두)", () => {
    expect(hasSessionCookie("sb-kgbqia-auth-token=base64-abc")).toBe(true);
    expect(hasSessionCookie("theme=dark; sb-kgbqia-auth-token=base64-abc; x=1")).toBe(true);
  });

  it("길어서 나뉜 쿠키(.0, .1)도 인식한다", () => {
    expect(hasSessionCookie("sb-kgbqia-auth-token.0=base64-abc; sb-kgbqia-auth-token.1=def")).toBe(true);
  });

  it("값이 비어 있으면(로그아웃 후 지워진 쿠키) false", () => {
    expect(hasSessionCookie("sb-kgbqia-auth-token=; theme=dark")).toBe(false);
  });

  it("PKCE 코드 검증 쿠키만으로는 로그인이 아니다", () => {
    expect(hasSessionCookie("sb-kgbqia-auth-token-code-verifier=xyz")).toBe(false);
  });
});
