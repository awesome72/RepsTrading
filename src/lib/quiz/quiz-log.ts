import { startOfLocalDay } from "@/lib/metrics/progress";
import type { SetupLabel } from "@/lib/market/scenario";
import type { QuizAnswer, QuizScore } from "./quiz";

export type QuizLogEntry = {
  seed: number;
  label: SetupLabel;
  correct: boolean;
  at: number;
};

const KEY = "reps.quiz.v1";
/** 무한히 쌓이지 않게 최근 것만 남긴다 — 오늘 통계·오답 복습 모두 이 정도면 충분하다 */
const MAX_ENTRIES = 500;

export function loadQuizLog(): QuizLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QuizLogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveQuizLog(log: QuizLogEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // 저장 실패해도 이번 방문 동안은 화면에 남는다
  }
}

/** 이번 문제를 기록에 추가하고 저장한다. 새 기록 배열을 반환한다 */
export function recordQuizAnswer(log: QuizLogEntry[], answer: QuizAnswer, now = Date.now()): QuizLogEntry[] {
  const entry: QuizLogEntry = { seed: answer.seed, label: answer.label, correct: answer.correct, at: now };
  const next = [...log, entry].slice(-MAX_ENTRIES);
  saveQuizLog(next);
  return next;
}

/** 오늘(로컬 자정 기준) 문제만 뽑아 정답률을 낸다 */
export function todayQuizScore(log: QuizLogEntry[], now = Date.now()): QuizScore {
  const start = startOfLocalDay(now);
  const today = log.filter((e) => e.at >= start);
  const correct = today.filter((e) => e.correct).length;
  return { total: today.length, correct, accuracy: today.length === 0 ? 0 : correct / today.length };
}

/**
 * 아직 못 맞힌 문제의 seed 목록. 같은 seed를 여러 번 풀었으면 가장 최근 결과만 본다 —
 * 틀렸다가 나중에 맞혔으면 더 이상 복습 대상이 아니다. 가장 최근에 틀린 것이 앞에 온다.
 */
export function missedSeeds(log: QuizLogEntry[]): number[] {
  const latestBySeed = new Map<number, QuizLogEntry>();
  for (const entry of log) latestBySeed.set(entry.seed, entry); // 뒤에 올수록 최신이라 덮어쓴다
  return [...latestBySeed.values()]
    .filter((e) => !e.correct)
    .sort((a, b) => b.at - a.at)
    .map((e) => e.seed);
}
