import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL } from "@/lib/seo/pages";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "@/components/layout/top-bar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { StatsBar } from "@/components/layout/stats-bar";
import { SessionSync } from "@/components/auth/session-sync";
import { Disclaimer } from "@/components/layout/disclaimer";
import { WebAnalytics } from "@/components/layout/analytics";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// 본문 전체에 쓰이는 한글 폰트 — 실제로 쓰는 4가지 굵기만 자체 호스팅한다.
// (전에는 외부 CDN <link rel="stylesheet">였음 — 매 페이지 로드마다 별도 origin으로
// CSS를 한 번 더 왕복해야 했다. next/font/local은 이 CSS를 빌드 타임에 인라인하고
// 같은 origin에서 폰트 파일을 서빙해 그 왕복을 없앤다.)
// 파일은 제작자가 공식 배포하는 서브셋(npm `pretendard` dist/web/static/woff2-subset —
// KS X 1001 한글 2,350자 + 자주 쓰는 한글·영문·기호)이다. 전체판은 굵기당 ~770KB라
// 4개면 3MB를 모든 페이지가 미리 받아야 했다(모바일 첫 화면 17초대). 서브셋은 굵기당 ~268KB.
// 목록에 없는 드문 글자(예: ▲▼)는 시스템 폰트로 대신 그려진다.
// 직접 서브셋하지 않는 이유: 라이선스(OFL)의 예약 폰트 이름 조항 때문에 수정본은 이름을 바꿔야 한다.
const pretendard = localFont({
  src: [
    { path: "./fonts/pretendard/Pretendard-Regular.subset.woff2", weight: "400", style: "normal" },
    { path: "./fonts/pretendard/Pretendard-Medium.subset.woff2", weight: "500", style: "normal" },
    { path: "./fonts/pretendard/Pretendard-SemiBold.subset.woff2", weight: "600", style: "normal" },
    { path: "./fonts/pretendard/Pretendard-Bold.subset.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-pretendard-local",
  display: "swap",
});

const TITLE = "REPS — 연습을 성적표로";
const DESCRIPTION =
  "REPS는 가상 데이터로 트레이딩 판단을 연습하고 채점하는 훈련 도구입니다. 실제 주문을 실행하지 않으며 투자 자문이 아닙니다.";

export const metadata: Metadata = {
  // opengraph-image.png/twitter-image가 절대 URL로 해석되려면 필요하다 (없으면 상대 경로로 남아
  // 카카오톡·슬랙 등 외부 크롤러가 이미지를 못 가져온다)
  metadataBase: new URL(SITE_URL),
  // 하위 경로는 "연습 — REPS"처럼 제목만 바꾼다 (lib/seo/pages.ts)
  title: { default: TITLE, template: "%s — REPS" },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${jetbrainsMono.variable} ${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={150}>
          <SessionSync />
          <TopBar />
          <StatsBar />
          {/* 모바일 하단 고정 영역(탭바 64px + 한 줄 고지 ~27px)보다 넉넉히 비워야 마지막 버튼이 가려지지 않는다 */}
          <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 pb-28 md:pb-12">
            {children}
          </main>
          <Disclaimer />
          <BottomTabBar />
          <WebAnalytics />
        </TooltipProvider>
      </body>
    </html>
  );
}
