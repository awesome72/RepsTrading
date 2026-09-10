import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "@/components/layout/top-bar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { StatsBar } from "@/components/layout/stats-bar";
import { MigrationRunner } from "@/components/auth/migration-runner";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REPS — 연습을 성적표로",
  description:
    "REPS는 가상 데이터로 트레이딩 판단을 연습하고 채점하는 훈련 도구입니다. 실제 주문을 실행하지 않으며 투자 자문이 아닙니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={150}>
          <MigrationRunner />
          <TopBar />
          <StatsBar />
          <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 pb-16 md:pb-0">
            {children}
          </main>
          <BottomTabBar />
        </TooltipProvider>
      </body>
    </html>
  );
}
