"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useAccountStore } from "@/lib/account/store";
import { useUser } from "@/lib/auth/use-user";
import { createClient } from "@/lib/supabase/client";

const LEVEL_LABEL: Record<number, string> = { 1: "1단계 · 실행", 2: "2단계 · 판별", 3: "3단계 · 전환" };

export function TopBar() {
  const gateLevel = useAccountStore((s) => s.gateLevel);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    useAccountStore.getState().hydrate();
  }, []);

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-4">
        <span className="font-mono text-lg font-bold tracking-tight text-primary">
          REPS
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/glossary"
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            용어 사전
          </Link>
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              로그아웃
            </button>
          )}
          <Badge className="border border-border bg-card font-normal text-foreground">
            {LEVEL_LABEL[gateLevel] ?? "1단계 · 실행"}
          </Badge>
        </div>
      </div>
    </header>
  );
}
