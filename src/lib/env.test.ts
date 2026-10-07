import { describe, expect, it } from "vitest";
import { parseSupabaseEnv } from "./env";

describe("parseSupabaseEnv", () => {
  it("올바른 값이면 그대로 돌려준다 (앞뒤 공백은 정리)", () => {
    expect(parseSupabaseEnv({ url: " https://abc.supabase.co ", anonKey: " key " })).toEqual({
      url: "https://abc.supabase.co",
      anonKey: "key",
    });
  });

  it("CI의 자리표시 값도 통과한다 — 빌드가 깨지면 안 된다", () => {
    expect(() => parseSupabaseEnv({ url: "https://placeholder.supabase.co", anonKey: "placeholder-anon-key" })).not.toThrow();
  });

  it("주소가 없으면 어떤 변수가 문제인지 말해준다", () => {
    expect(() => parseSupabaseEnv({ anonKey: "k" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL이 비어/);
  });

  it("키가 없으면 키를 짚는다", () => {
    expect(() => parseSupabaseEnv({ url: "https://a.co" })).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY가 비어/);
  });

  it("둘 다 없으면 둘 다 알려준다", () => {
    expect(() => parseSupabaseEnv({})).toThrow(/URL이 비어.*ANON_KEY가 비어/);
  });

  it("공백뿐인 값은 없는 것으로 본다", () => {
    expect(() => parseSupabaseEnv({ url: "   ", anonKey: "  " })).toThrow(/비어/);
  });

  it("주소 형식이 틀리면 알려준다", () => {
    expect(() => parseSupabaseEnv({ url: "supabase.co", anonKey: "k" })).toThrow(/올바른 주소/);
    expect(() => parseSupabaseEnv({ url: "ftp://abc.supabase.co", anonKey: "k" })).toThrow(/올바른 주소/);
  });

  it("오류 메시지에 값 자체는 싣지 않는다 (키가 로그에 남지 않게)", () => {
    try {
      parseSupabaseEnv({ url: "not a url SECRETVALUE", anonKey: "SECRETKEY" });
    } catch (e) {
      expect(String(e)).not.toContain("SECRETVALUE");
      expect(String(e)).not.toContain("SECRETKEY");
    }
  });
});
