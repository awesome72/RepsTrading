"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getGlossaryTerm } from "@/lib/glossary";

type TermProps = {
  id: string;
  children?: React.ReactNode;
};

export function Term({ id, children }: TermProps) {
  const [open, setOpen] = useState(false);
  const [canHover] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
  );
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const entry = getGlossaryTerm(id);

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

  if (!entry) {
    return <>{children}</>;
  }

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
        className="inline border-0 bg-transparent p-0 font-medium text-foreground underline decoration-muted-foreground decoration-dotted underline-offset-4 cursor-help"
      >
        {children ?? entry.term}
      </button>
      {open && pos
        ? createPortal(
            <span
              role="tooltip"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-50 w-max max-w-[260px] -translate-x-1/2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[13px] leading-relaxed text-foreground shadow-md"
            >
              {entry.description}
            </span>,
            document.body
          )
        : null}
    </>
  );
}
