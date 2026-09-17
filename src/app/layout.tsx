import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "@/components/layout/top-bar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { StatsBar } from "@/components/layout/stats-bar";
import { SessionSync } from "@/components/auth/session-sync";
import { Disclaimer } from "@/components/layout/disclaimer";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// 본문 전체에 쓰이는 한글 폰트 — 실제로 쓰는 4가지 굵기만 자체 호스팅한다.
// (전에는 외부 CDN <link rel="stylesheet">였음 — 매 페이지 로드마다 별도 origin으로
// CSS를 한 번 더 왕복해야 했다. next/font/local은 이 CSS를 빌드 타임에 인라인하고
// 같은 origin에서 폰트 파일을 서빙해 그 왕복을 없앤다.)
const pretendard = localFont({
  src: [
    { path: "./fonts/pretendard/Pretendard-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/pretendard/Pretendard-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/pretendard/Pretendard-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/pretendard/Pretendard-Bold.woff2", weight: "700", style: "normal" },
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
  metadataBase: new URL("https://reps-trading.vercel.app"),
  title: TITLE,
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
        </TooltipProvider>
      </body>
    </html>
  );
}
