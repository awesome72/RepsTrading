import Link from "next/link";
import { Button } from "@/components/ui/button";

/** 없는 주소 — Next.js 기본 404(영어·흰 배경) 대신 REPS 톤으로 보여준다 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="num text-[13px] text-muted-foreground">404</p>
      <h1 className="text-[20px] font-bold text-foreground">찾을 수 없는 페이지입니다</h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        주소가 바뀌었거나 잘못 입력됐을 수 있습니다.
      </p>
      <div className="flex gap-2">
        <Button asChild className="h-10 px-6 text-[14px] font-semibold">
          <Link href="/practice">연습하러 가기</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 px-6 text-[14px] font-semibold">
          <Link href="/">처음으로</Link>
        </Button>
      </div>
    </div>
  );
}
