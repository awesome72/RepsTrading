"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * 루트 레이아웃(SessionSync·TopBar·StatsBar 등 모든 페이지에 붙는 부분) 자체가 깨졌을 때만 뜬다.
 * error.tsx는 레이아웃 안쪽만 잡으므로 이게 없으면 Next.js 기본 영어 화면이 나온다.
 * 레이아웃을 대신하므로 html/body를 직접 그리고, 원인일 수 있는 공용 컴포넌트는 쓰지 않는다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
        <h1 className="text-[20px] font-bold">문제가 생겼습니다</h1>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          예상치 못한 오류가 발생했습니다. 연습 기록은 안전하게 남아 있습니다. 다시 시도해보세요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-10 rounded-lg bg-primary px-6 text-[14px] font-semibold text-primary-foreground"
          >
            다시 시도
          </button>
          {/* 레이아웃이 깨진 상태라 클라이언트 라우팅 대신 전체 새로고침으로 이동한다 */}
          <a
            href="/practice"
            className="flex h-10 items-center rounded-lg border border-border px-6 text-[14px] font-semibold"
          >
            연습으로 돌아가기
          </a>
        </div>
      </body>
    </html>
  );
}
