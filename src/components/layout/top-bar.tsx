import { Badge } from "@/components/ui/badge";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-4">
        <span className="font-mono text-lg font-bold tracking-tight text-ink">
          REPS
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline num">
            이번 주 12회
          </span>
          <Badge className="bg-surface text-ink border border-border font-normal">
            1단계 · 실행
          </Badge>
        </div>
      </div>
    </header>
  );
}
