"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  triggerClassName?: string;
};

/** 호버(데스크톱)/탭(모바일)으로 여는 포털 툴팁의 공통 로직. <Term>이 이걸 감싼다. */
export function InfoTooltip({ content, children, triggerClassName }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [canHover] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
  );
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });

    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={canHover ? () => setOpen(true) : undefined}
        onMouseLeave={canHover ? () => setOpen(false) : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn("inline border-0 bg-transparent p-0", triggerClassName)}
      >
        {children}
      </button>
      {open && pos
        ? createPortal(
            <span
              role="tooltip"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-50 w-max max-w-[260px] -translate-x-1/2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[13px] leading-relaxed text-foreground shadow-md"
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </>
  );
}
