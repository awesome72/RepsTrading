import Link from "next/link";
import { GUEST_REP_LIMIT } from "@/lib/rep/log-store";

type GuestNoticeProps = {
  /** 게스트로 이미 한 판단 수 (지나간 것 포함) */
  count: number;
  /** banner: 연습 화면 상단 한 줄 / limit: 게스트 한도를 다 썼을 때 / page: 로그인이 필요한 화면 */
  variant: "banner" | "limit" | "page";
  title?: string;
};

export function GuestNotice({ count, variant, title }: GuestNoticeProps) {
  if (variant === "banner") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-2.5">
          <span className="font-medium text-foreground">게스트 연습</span>
          {/* 한도 중 몇 회를 썼는지 — 점수·배지가 아니라 남은 무료 횟수 표시다 */}
          <span className="flex gap-1" role="img" aria-label={`${GUEST_REP_LIMIT}회 중 ${count}회 사용`}>
            {Array.from({ length: GUEST_REP_LIMIT }, (_, i) => (
              <span key={i} className={i < count ? "h-1.5 w-4 rounded-full bg-primary" : "h-1.5 w-4 rounded-full bg-surface-2"} />
            ))}
          </span>
          <span className="num">
            {count}/{GUEST_REP_LIMIT}
          </span>
          <span className="hidden sm:inline">· 기록은 이 브라우저에만 저장됩니다</span>
        </span>
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">
          로그인하고 기록 지키기 →
        </Link>
      </div>
    );
  }

  const heading =
    title ?? (variant === "limit" ? `게스트 연습 ${GUEST_REP_LIMIT}회를 모두 마쳤습니다.` : "로그인하면 볼 수 있습니다.");
  const body =
    count > 0
      ? `로그인하면 지금까지 게스트로 한 ${count}회가 그대로 옮겨지고, 기기를 바꿔도 이어서 연습할 수 있습니다.`
      : "로그인하면 연습 기록이 계정에 저장되어 기기를 바꿔도 이어서 볼 수 있습니다.";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <p className="text-[16px] font-bold text-foreground">{heading}</p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      <p className="text-[12px] text-muted-foreground">비밀번호 없이 이메일 링크로 로그인합니다.</p>
      <Link
        href="/login"
        className="mt-2 rounded-full bg-primary px-6 py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
      >
        {variant === "limit" ? "로그인하고 이어서 하기" : "로그인"}
      </Link>
    </div>
  );
}
