"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Next.js App Router의 세그먼트 에러 바운더리 — 렌더링 중 예외를 잡아
 * 기본(영어) 에러 화면 대신 REPS 톤의 한국어 화면을 보여준다.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-[20px] font-bold text-foreground">문제가 생겼습니다</h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        예상치 못한 오류가 발생했습니다. 연습 기록은 안전하게 남아 있습니다. 다시 시도해보세요.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} className="h-10 px-6 text-[14px] font-semibold">
          다시 시도
        </Button>
        <Button
          variant="outline"
          className="h-10 px-6 text-[14px] font-semibold"
          onClick={() => router.push("/practice")}
        >
          연습으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
