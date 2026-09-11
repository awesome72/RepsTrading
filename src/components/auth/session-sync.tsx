"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/auth/use-user";
import { useRepLogStore } from "@/lib/rep/log-store";
import { useAccountStore } from "@/lib/account/store";
import { apiMigrate } from "@/lib/rep/api";
import type { Rep } from "@/lib/rep/types";

const LEGACY_LOG_KEY = "reps.journal.v1";
/** STAGE 6 이전에 로컬에만 쌓인 기록 전체 */
const MIGRATED_V1 = "reps.migrated.v1";
/** STAGE 6 이후에도 서버에 안 올라가고 로컬에만 남던 "지나간다" 기록 */
const MIGRATED_V2 = "reps.migrated.v2";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function setFlags() {
  try {
    localStorage.setItem(MIGRATED_V1, "true");
    localStorage.setItem(MIGRATED_V2, "true");
  } catch {
    // ignore
  }
}

/**
 * 로컬에만 있던 기록을 서버로 올린다. 실패하면 플래그를 세우지 않고 로컬 데이터도 지우지 않는다.
 * 계획을 저장한 연습은 이미 API로 서버에 있으므로, V1 이후에는 "지나간다"만 올린다
 * (다시 올리면 committed_at이 달라 중복 행이 생긴다).
 */
async function migrateLegacyLog() {
  const v1 = readFlag(MIGRATED_V1);
  if (v1 && readFlag(MIGRATED_V2)) return;

  let legacy: Rep[] = [];
  try {
    const raw = localStorage.getItem(LEGACY_LOG_KEY);
    legacy = raw ? (JSON.parse(raw) as Rep[]) : [];
  } catch {
    return;
  }

  const toUpload = v1 ? legacy.filter((r) => r.exitReason === "pass") : legacy;
  if (toUpload.length > 0) await apiMigrate(toUpload);
  setFlags();
}

/** 로그인하면 서버 기록·설정을 받아오고, 로그아웃하면 화면에 남은 이전 사용자 데이터를 비운다 */
export function SessionSync() {
  const { user, loading } = useUser();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const id = user?.id ?? null;
    const prev = userIdRef.current;
    if (id === prev) return;
    userIdRef.current = id;

    if (prev) {
      useRepLogStore.getState().reset();
      useAccountStore.getState().reset();
    }
    if (!id) return;

    migrateLegacyLog()
      .catch(() => {})
      .finally(() => {
        if (userIdRef.current !== id) return;
        useRepLogStore.getState().refresh();
        useAccountStore
          .getState()
          .syncWithServer()
          .catch(() => {});
      });
  }, [user, loading]);

  return null;
}
