import type { Rep } from "@/lib/rep/types";
import { adherenceRate, expectancy, gradeDistribution, setupAccuracy, tradedReps } from "./stats";

/** 하루 목표 — 온보딩의 "하루 10번씩 하면 한 달(300회)"과 같은 단위다 */
export const DAILY_GOAL = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

function repTime(rep: Rep): number {
  return rep.committedAt ?? rep.openedAt;
}

/** 사용자 기기 시간대 기준 그날 0시 */
export function startOfLocalDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 사용자 기기 시간대 기준 이번 주 월요일 0시 */
export function startOfLocalWeek(t: number): number {
  const d = new Date(startOfLocalDay(t));
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
}

function inRange(reps: Rep[], from: number, to: number): Rep[] {
  return reps.filter((r) => {
    const t = repTime(r);
    return t >= from && t < to;
  });
}

/** 오늘 실제로 산 연습 수 — 게이트 누적 횟수와 같은 기준(지나간 것 제외) */
export function todayTradedCount(reps: Rep[], now: number = Date.now()): number {
  return tradedReps(inRange(reps, startOfLocalDay(now), Infinity)).length;
}

export type PeriodStats = {
  count: number;
  adherence: number;
  aRate: number;
  accuracy: number;
  expectancy: number;
};

function periodStats(reps: Rep[]): PeriodStats {
  const count = tradedReps(reps).length;
  return {
    count,
    adherence: adherenceRate(reps),
    aRate: count > 0 ? gradeDistribution(reps).A / count : 0,
    accuracy: setupAccuracy(reps),
    expectancy: expectancy(reps),
  };
}

/** 이번 주(월요일부터 지금까지)와 지난주를 같은 지표로 나란히 비교한다 */
export function weeklyComparison(
  reps: Rep[],
  now: number = Date.now()
): { thisWeek: PeriodStats; lastWeek: PeriodStats } {
  const weekStart = startOfLocalWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  return {
    thisWeek: periodStats(inRange(reps, weekStart, Infinity)),
    lastWeek: periodStats(inRange(reps, lastWeekStart.getTime(), weekStart)),
  };
}

/**
 * 최근 7일 속도로 목표 횟수까지 며칠 남았는지. 최근 7일에 연습이 없으면 추정하지 않는다(null).
 */
export function paceEstimate(
  reps: Rep[],
  target: number,
  now: number = Date.now()
): { perDay: number; daysLeft: number | null; remaining: number } {
  const traded = tradedReps(reps);
  const remaining = Math.max(0, target - traded.length);
  const recent = traded.filter((r) => repTime(r) > now - 7 * DAY_MS).length;
  const perDay = recent / 7;
  return { perDay, remaining, daysLeft: perDay > 0 ? Math.ceil(remaining / perDay) : null };
}
