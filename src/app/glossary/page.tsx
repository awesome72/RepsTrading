"use client";

import { useMemo, useState } from "react";
import { glossary } from "@/lib/glossary";

const TERMS = Object.values(glossary);

export default function GlossaryPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TERMS;
    return TERMS.filter(
      (t) => t.term.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-4 py-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground">용어 사전</h1>
        <p className="text-[13px] text-muted-foreground">
          연습 중에 나오는 단어를 여기서 다시 찾아볼 수 있습니다.
        </p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="용어 검색 (예: R, 손절, 눌림목)"
        className="h-10 rounded-md border border-border bg-card px-3 text-[14px] text-foreground outline-none focus:border-primary"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          &ldquo;{query}&rdquo;와 일치하는 용어가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((t) => (
            <div key={t.id} className="flex flex-col gap-1 px-4 py-3">
              <p className="text-[14px] font-semibold text-foreground">{t.term}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {t.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
