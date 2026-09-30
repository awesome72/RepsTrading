import type { LucideIcon } from "lucide-react";

/** 기록·진척처럼 아직 데이터가 없을 때의 공통 빈 화면 — 아이콘 + 한 줄 제목 + 설명 + 다음 행동 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="text-[16px] font-semibold text-foreground">{title}</p>
        {children && <div className="text-[13px] leading-relaxed text-muted-foreground">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/** 빈 화면의 주 행동 버튼 스타일 — Link/button 어느 쪽에도 붙인다 */
export const EMPTY_ACTION_CLASS =
  "rounded-full bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/85";
