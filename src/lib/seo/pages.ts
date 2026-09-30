import type { Metadata } from "next";

export const SITE_URL = "https://reps-trading.vercel.app";
export const SITE_NAME = "REPS";

type PageMeta = {
  title: string;
  description: string;
  /** false: 검색엔진에 올리지 않는다(개인 기록·계정 화면) — sitemap에서도 빠진다 */
  index: boolean;
};

/**
 * 경로별 제목·설명. 페이지 대부분이 클라이언트 컴포넌트라 page.tsx에서 metadata를 못 내보내므로,
 * 각 경로의 layout.tsx가 pageMetadata()로 여기 값을 쓴다. sitemap.ts도 같은 목록을 본다.
 * 제목은 루트 레이아웃의 템플릿으로 "제목 — REPS"가 된다.
 */
export const PAGE_META = {
  "/practice": {
    title: "연습",
    description: "가려진 차트를 보고 살지 지나갈지 판단하고, 사기 전에 셋업·손절·목표를 적은 뒤 결과보다 먼저 스스로 채점합니다.",
    index: true,
  },
  "/quiz": {
    title: "판별 퀴즈",
    description: "차트를 보고 눌림목·돌파·셋업 없음 중 하나를 고르면 바로 정답과 그 뒤의 움직임을 보여줍니다. 모양을 알아보는 눈을 짧게 반복 훈련합니다.",
    index: true,
  },
  "/tutorial": {
    title: "사용법",
    description: "REPS를 처음 쓰는 분을 위한 2분 사용법 — 실제 화면과 음성·자막으로 연습부터 채점, 결과 공개까지 안내합니다.",
    index: true,
  },
  "/glossary": {
    title: "용어 사전",
    description: "손절, R, 기대값, 눌림목, 돌파 등 연습 중에 나오는 트레이딩 용어를 쉬운 말로 풀어둔 사전입니다.",
    index: true,
  },
  "/onboarding": {
    title: "시작하기",
    description: "계좌 금액과 한 번에 걸 위험 비율, 연습할 셋업을 정하고 안내에 따라 첫 연습을 해봅니다. 5분이면 끝납니다.",
    index: true,
  },
  "/journal": {
    title: "기록",
    description: "지금까지의 연습 기록을 셋업·등급별로 다시 봅니다.",
    index: false,
  },
  "/progress": {
    title: "진척",
    description: "평균 R, 계획 지킴률, 판단×결과 표와 단계 기준까지의 진척을 봅니다.",
    index: false,
  },
  "/settings": {
    title: "설정",
    description: "위험 한도와 연습할 셋업을 바꿉니다.",
    index: false,
  },
  "/login": {
    title: "로그인",
    description: "비밀번호 없이 이메일 링크로 로그인하고, 연습 기록을 계정에 저장합니다.",
    index: false,
  },
} satisfies Record<string, PageMeta>;

export type PagePath = keyof typeof PAGE_META;

export function pageMetadata(path: PagePath): Metadata {
  const meta: PageMeta = PAGE_META[path];
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: path },
    robots: meta.index ? undefined : { index: false, follow: true },
  };
}

/** sitemap에 올릴 경로 — 홈 + 색인 허용 페이지 */
export function indexablePaths(): string[] {
  return ["/", ...(Object.keys(PAGE_META) as PagePath[]).filter((p) => PAGE_META[p].index)];
}
