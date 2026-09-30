"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserClient, hasSessionCookie } from "@/lib/supabase/client";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // 세션 쿠키가 없으면 로그인 상태일 수 없다 — 게스트는 Supabase(~230KB)를 받지도 실행하지도 않는다.
    // (로그인은 /auth/callback에서 쿠키가 생긴 뒤 새 페이지로 들어오므로, 이 판단이 틀릴 일이 없다)
    if (!hasSessionCookie(document.cookie)) {
      // effect 안에서 동기로 setState하지 않도록 한 틱 미룬다
      Promise.resolve().then(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    // 클라이언트는 첫 화면 뒤에 불러온다(lib/supabase/client.ts) — 그동안 loading=true로 둔다
    getBrowserClient().then((supabase) => {
      if (cancelled) return;
      supabase.auth.getUser().then(({ data }) => {
        if (cancelled) return;
        setUser(data.user);
        setLoading(false);
      });
      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setUser(session?.user ?? null);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return { user, loading };
}
