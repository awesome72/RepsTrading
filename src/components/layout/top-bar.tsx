"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountStore } from "@/lib/account/store";
import { useUser } from "@/lib/auth/use-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, isActivePath } from "./nav-items";
import { StatsSummary } from "./stats-bar";

const LEVEL_LABEL: Record<number, string> = { 1: "1단계 · 실행", 2: "2단계 · 판별", 3: "3단계 · 전환" };

export function Logo() {
  return (
    // 보이는 글자("REPS")가 링크 이름에 그대로 들어가야 한다 — 음성 명령("REPS 누르기")으로도 찾을 수 있게
    <Link href="/" className="flex items-center gap-2">
      <span
        aria-hidden
        className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[13px] font-bold text-primary-foreground"
      >
        R
      </span>
      <span className="text-[15px] font-bold tracking-[0.14em] text-foreground">REPS</span>
      <span className="sr-only"> 홈</span>
    </Link>
  );
}

export function TopBar() {
  const gateLevel = useAccountStore((s) => s.gateLevel);
  const serverSynced = useAccountStore((s) => s.serverSynced);
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-8 px-4">
        <Logo />

        {/* 데스크톱 주 내비 — 모바일은 하단 탭바가 같은 목록을 보여준다 */}
        <nav className="hidden h-full items-stretch gap-6 md:flex">
          {PRIMARY_NAV.map(({ href, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center text-[13px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-[12px] lg:flex">
            <StatsSummary />
          </div>
          {user && serverSynced && (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              {LEVEL_LABEL[gateLevel]}
            </span>
          )}
          {!user && (
            <Link
              href="/login"
              className="rounded-full border border-border px-3 py-1 text-[12px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              로그인
            </Link>
          )}
          {/* 자주 안 쓰는 링크(사용법·용어 사전·설정·로그아웃)는 메뉴 하나로 모은다 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="메뉴 더보기"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Menu size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem asChild>
                <Link href="/tutorial">사용법</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/glossary">용어 사전</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">설정</Link>
              </DropdownMenuItem>
              {user && <DropdownMenuItem onSelect={handleLogout}>로그아웃</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
