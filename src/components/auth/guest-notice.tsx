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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2 text-[12px] text-muted-foreground">
        <span>
          게스트로 연습 중 · <span className="num text-foreground">{count}/{GUEST_REP_LIMIT}</span>회 — 기록은 이
          브라우저에만 저장되고, 로그인하면 계정으로 옮겨집니다.
        </span>
        <Link href="/login" className="font-semibold text-primary hover:underline">
          로그인
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
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center">
      <p className="text-[16px] font-bold text-foreground">{heading}</p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      <p className="text-[12px] text-muted-foreground">비밀번호 없이 이메일 링크로 로그인합니다.</p>
      <Link
        href="/login"
        className="mt-1 rounded-md bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground"
      >
        {variant === "limit" ? "로그인하고 이어서 하기" : "로그인"}
      </Link>
    </div>
  );
}
