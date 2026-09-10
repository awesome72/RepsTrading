import { Badge } from "@/components/ui/badge";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-4">
        <span className="font-mono text-lg font-bold tracking-tight text-primary">
          REPS
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted-foreground sm:inline num">
            이번 주 12회
          </span>
          <Badge className="border border-border bg-card font-normal text-foreground">
            1단계 · 실행
          </Badge>
        </div>
      </div>
    </header>
  );
}
