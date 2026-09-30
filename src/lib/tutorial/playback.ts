/** 소개 영상 재생에 쓰는 순수 계산 — 장면 길이 추정, 이어보기 위치 저장 */

export const PLAYBACK_SPEEDS = [0.9, 1, 1.2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

/** 한국어 음성 합성은 대략 초당 7~8자를 읽는다 — 장면 진행 막대와 음성 없는 재생 시간에 쓴다 */
const MS_PER_CHAR = 130;
const MIN_SCENE_MS = 4000;

export function estimateSceneMs(caption: string, speed: number = 1): number {
  const chars = caption.replace(/\s+/g, "").length;
  return Math.round(Math.max(MIN_SCENE_MS, chars * MS_PER_CHAR) / speed);
}

const PROGRESS_KEY = "reps.tutorial.v1";

type SavedProgress = { index: number; savedAt: number };

/**
 * 마지막으로 보던 장면. 첫 장면·마지막 장면은 "이어볼" 의미가 없으니 null로 돌려준다.
 * 장면 수가 바뀌어 범위를 벗어나거나 저장값이 깨져 있으면 역시 null.
 */
export function loadTutorialProgress(sceneCount: number): number | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedProgress;
    if (!Number.isInteger(saved.index)) return null;
    if (saved.index <= 0 || saved.index >= sceneCount - 1) return null;
    return saved.index;
  } catch {
    return null;
  }
}

export function saveTutorialProgress(index: number, now: number = Date.now()): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ index, savedAt: now } satisfies SavedProgress));
  } catch {
    // 저장 실패해도 재생에는 지장 없다
  }
}

export function clearTutorialProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // ignore
  }
}
