"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountStore } from "@/lib/account/store";
import { useUser } from "@/lib/auth/use-user";
import { createClient } from "@/lib/supabase/client";

const LEVEL_LABEL: Record<number, string> = { 1: "1단계 · 실행", 2: "2단계 · 판별", 3: "3단계 · 전환" };

export function TopBar() {
  const gateLevel = useAccountStore((s) => s.gateLevel);
  const serverSynced = useAccountStore((s) => s.serverSynced);
  const { user } = useUser();
  const router = useRouter();

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
          {/* 판별 퀴즈는 모바일 하단 탭바에도 있어 중복이라 거기서는 뺀다 */}
          <Link
            href="/quiz"
            className="hidden text-[12px] text-muted-foreground hover:text-foreground md:inline"
          >
            판별 퀴즈
          </Link>
          <Link
            href="/tutorial"
            className="hidden text-[12px] text-muted-foreground hover:text-foreground md:inline"
          >
            사용법
          </Link>
          <Link
            href="/glossary"
            className="hidden text-[12px] text-muted-foreground hover:text-foreground md:inline"
          >
            용어 사전
          </Link>
          <Link
            href="/settings"
            className="hidden text-[12px] text-muted-foreground hover:text-foreground md:inline"
          >
            설정
          </Link>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              로그아웃
            </button>
          ) : (
            <Link href="/login" className="text-[12px] font-semibold text-primary hover:underline">
              로그인
            </Link>
          )}
          {user && serverSynced && (
            <Badge className="border border-border bg-card font-normal text-foreground">
              {LEVEL_LABEL[gateLevel]}
            </Badge>
          )}
          {/* 모바일에서만: 자주 안 쓰는 링크(사용법·용어 사전·설정)를 메뉴 하나로 모은다 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="메뉴 더보기"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground md:hidden"
            >
              <Menu size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/tutorial">사용법</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/glossary">용어 사전</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">설정</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
