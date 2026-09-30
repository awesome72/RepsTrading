/**
 * 결과 잠금의 서버 쪽 규칙 한 곳.
 * 채점(GRADED) 전에는 결과(청산가·R)와 정답 셋업을 응답에 싣지 않는다 — 화면에서 숨기는 게 아니라
 * 서버가 아예 보내지 않는다. reps 행을 그대로 응답하는 모든 API가 이 함수를 거쳐야 한다
 * (result-lock.test.ts가 api/ 아래 라우트를 훑어 이를 검사한다).
 */

/** 채점 전 응답에서 지우는 필드 — 새 결과성 컬럼을 추가하면 여기에도 넣을 것 */
export const RESULT_LOCKED_FIELDS = ["exit_price", "r_result", "setup_label"] as const;

/** 결과를 보여줘도 되는 상태. 모르는 상태 값이면 false — 잠그는 쪽으로 실패한다 */
export function isResultVisible(state: unknown): boolean {
  return state === "GRADED" || state === "REVEALED";
}

/** 채점 전이면 결과 필드를 뺀 사본을, 채점 후면 그대로 돌려준다. 입력은 바꾸지 않는다 */
export function stripUngradedResult(rep: object): Record<string, unknown> {
  if (isResultVisible((rep as { state?: unknown }).state)) return rep as Record<string, unknown>;
  const payload: Record<string, unknown> = { ...rep };
  for (const field of RESULT_LOCKED_FIELDS) delete payload[field];
  return payload;
}
