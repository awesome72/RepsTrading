"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/auth/use-user";
import { useRepLogStore } from "@/lib/rep/log-store";
import { apiMigrate } from "@/lib/rep/api";

const MIGRATED_FLAG_KEY = "reps.migrated.v1";

/**
 * 로그인 시 localStorage에 남아있던 연습 기록을 서버로 한 번 옮긴다.
 * 실패하면 플래그를 세우지 않는다 — 로컬 데이터도 지우지 않는다. 다음 로그인 때 다시 시도된다.
 */
export function MigrationRunner() {
  const { user } = useUser();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || ranRef.current) return;
    ranRef.current = true;

    let alreadyMigrated = false;
    try {
      alreadyMigrated = localStorage.getItem(MIGRATED_FLAG_KEY) === "true";
    } catch {
      // localStorage 접근 불가 시 매번 재시도하도록 둔다
    }
    if (alreadyMigrated) return;

    useRepLogStore.getState().hydrate();
    const reps = useRepLogStore.getState().reps;

    if (reps.length === 0) {
      try {
        localStorage.setItem(MIGRATED_FLAG_KEY, "true");
      } catch {
        // ignore
      }
      return;
    }

    apiMigrate(reps)
      .then(() => {
        try {
          localStorage.setItem(MIGRATED_FLAG_KEY, "true");
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // 실패 — 플래그를 세우지 않는다. 로컬 데이터도 그대로 둔다.
        ranRef.current = false;
      });
  }, [user]);

  return null;
}
