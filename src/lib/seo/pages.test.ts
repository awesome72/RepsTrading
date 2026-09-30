import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import path from "path";
import { PAGE_META, indexablePaths, pageMetadata, type PagePath } from "./pages";

const paths = Object.keys(PAGE_META) as PagePath[];

describe("PAGE_META", () => {
  it("모든 경로에 실제 페이지가 있다 — 경로 이름을 바꾸면 여기도 바꿔야 한다", () => {
    for (const p of paths) {
      expect(existsSync(path.join(process.cwd(), "src/app", p, "page.tsx")), p).toBe(true);
    }
  });

  it("제목은 짧고, 설명은 검색 결과에 맞는 길이다", () => {
    for (const p of paths) {
      expect(PAGE_META[p].title.length, p).toBeLessThanOrEqual(10);
      expect(PAGE_META[p].description.length, p).toBeGreaterThan(15);
      expect(PAGE_META[p].description.length, p).toBeLessThanOrEqual(120);
    }
  });

  it("제목이 서로 겹치지 않는다", () => {
    const titles = paths.map((p) => PAGE_META[p].title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("pageMetadata", () => {
  it("개인 기록·계정 화면은 noindex, 공개 화면은 기본값", () => {
    expect(pageMetadata("/journal").robots).toEqual({ index: false, follow: true });
    expect(pageMetadata("/login").robots).toEqual({ index: false, follow: true });
    expect(pageMetadata("/practice").robots).toBeUndefined();
  });

  it("canonical은 자기 경로", () => {
    expect(pageMetadata("/quiz").alternates?.canonical).toBe("/quiz");
  });
});

describe("indexablePaths", () => {
  it("홈과 공개 화면만 들어가고 개인 화면은 빠진다", () => {
    const list = indexablePaths();
    expect(list[0]).toBe("/");
    expect(list).toContain("/tutorial");
    expect(list).not.toContain("/journal");
    expect(list).not.toContain("/settings");
    expect(list).not.toContain("/login");
  });
});
