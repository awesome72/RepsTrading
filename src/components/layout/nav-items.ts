import { Activity, BarChart3, ClipboardList, Shapes } from "lucide-react";

/** 주 내비 — 데스크톱 상단 헤더와 모바일 하단 탭바가 같은 목록을 쓴다 */
export const PRIMARY_NAV = [
  { href: "/practice", label: "연습", icon: Activity },
  { href: "/quiz", label: "판별", icon: Shapes },
  { href: "/journal", label: "기록", icon: ClipboardList },
  { href: "/progress", label: "진척", icon: BarChart3 },
] as const;

export function isActivePath(pathname: string | null, href: string): boolean {
  return !!pathname && (pathname === href || pathname.startsWith(href + "/"));
}
