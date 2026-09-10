"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useAccountStore } from "@/lib/account/store";

const LEVEL_LABEL: Record<number, string> = { 1: "1단계 · 실행", 2: "2단계 · 판별", 3: "3단계 · 전환" };

export function TopBar() {
  const gateLevel = useAccountStore((s) => s.gateLevel);

  useEffect(() => {
    useAccountStore.getState().hydrate();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-4">
        <span className="font-mono text-lg font-bold tracking-tight text-primary">
          REPS
        </span>
        <Badge className="border border-border bg-card font-normal text-foreground">
          {LEVEL_LABEL[gateLevel] ?? "1단계 · 실행"}
        </Badge>
      </div>
    </header>
  );
}
