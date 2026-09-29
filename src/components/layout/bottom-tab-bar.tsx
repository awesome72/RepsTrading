"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, isActivePath } from "./nav-items";

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-background/95 backdrop-blur md:hidden">
      {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" />}
            <Icon size={20} strokeWidth={active ? 2.25 : 1.75} className={active ? "text-primary" : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
