/**
 * 코드가 기대하는 DB 스키마 목록과, 그걸 실제 DB에 물어보는 점검.
 *
 * DB 변경은 마이그레이션을 Supabase SQL 편집기에 손으로 붙여넣어 적용한다(자동 실행기 없음).
 * 그래서 "코드는 배포됐는데 DDL을 아직 안 돌린" 상태가 실제로 생길 수 있다 — 2026-09-17에
 * reps.setup_label/entry_price가 그랬다(DDL 전에 배포했다면 모든 연습 저장이 500이었다).
 * /api/keepalive가 이 목록으로 매일 점검하고, 어긋나면 GitHub 이슈 알림(.github/workflows/keepalive-check.yml)이 뜬다.
 *
 * 마이그레이션에 테이블·컬럼을 추가하면 여기에도 추가한다 — schema-check.test.ts가 빠진 항목을 잡는다.
 */
export const EXPECTED_SCHEMA: Record<string, string[]> = {
  users: ["id", "account_size", "risk_percent", "setup_preference", "onboarding_completed", "gate_level", "created_at", "updated_at"],
  setups: ["id", "label"],
  reps: [
    "id", "user_id", "setup_id", "scenario_seed", "state", "committed_at", "commit_hash",
    "plan_setup", "plan_stop", "plan_target_r", "exit_price", "exit_reason", "exit_index",
    "adhered", "decision_grade", "r_result", "input_seconds", "created_at",
    // 20260917_reps_cached_scenario_facts.sql
    "setup_label", "entry_price",
  ],
  gate_progress: ["user_id", "gate_level", "last_promoted_at", "last_demoted_at", "updated_at"],
  // 20260912_advice_rate_limit.sql
  ai_advice_requests: ["id", "user_id", "created_at"],
  // 20260912_reveal_survey.sql
  reveal_surveys: ["id", "user_id", "milestone", "rating", "created_at"],
};

/** 점검에 필요한 최소한의 클라이언트 모양 — 테스트에서 가짜로 갈아 끼운다 */
export type SchemaProbeClient = {
  from(table: string): {
    select(columns: string): { limit(n: number): PromiseLike<{ error: { message: string } | null }> };
  };
};

export type SchemaIssue = { table: string; detail: string };

/**
 * 각 테이블에서 기대 컬럼을 전부 골라 한 행만 요청한다. 익명 키라 RLS 때문에 행은 안 오지만,
 * PostgREST는 테이블·컬럼이 없으면 행이 없어도 오류를 돌려준다 — 그 차이로 어긋남을 알 수 있다.
 */
export async function checkSchema(
  client: SchemaProbeClient,
  expected: Record<string, string[]> = EXPECTED_SCHEMA
): Promise<SchemaIssue[]> {
  const results = await Promise.all(
    Object.entries(expected).map(async ([table, columns]) => {
      try {
        const { error } = await client.from(table).select(columns.join(",")).limit(1);
        return error ? { table, detail: error.message } : null;
      } catch (e) {
        return { table, detail: e instanceof Error ? e.message : "unknown error" };
      }
    })
  );
  return results.filter((r): r is SchemaIssue => r !== null);
}
