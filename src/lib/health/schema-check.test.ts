import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { EXPECTED_SCHEMA, checkSchema, type SchemaProbeClient } from "./schema-check";

/** 테이블별로 요청된 컬럼을 기록하고, 지정한 테이블/컬럼에서 오류를 돌려주는 가짜 클라이언트 */
function fakeClient(fail: Record<string, string> = {}, calls: { table: string; columns: string }[] = []): SchemaProbeClient {
  return {
    from(table) {
      return {
        select(columns) {
          calls.push({ table, columns });
          return {
            limit: async () => ({ error: fail[table] ? { message: fail[table] } : null }),
          };
        },
      };
    },
  };
}

describe("checkSchema", () => {
  it("모두 있으면 문제 없음", async () => {
    expect(await checkSchema(fakeClient())).toEqual([]);
  });

  it("테이블마다 기대 컬럼 전체를 골라 한 번씩 묻는다", async () => {
    const calls: { table: string; columns: string }[] = [];
    await checkSchema(fakeClient({}, calls));
    expect(calls.map((c) => c.table).sort()).toEqual(Object.keys(EXPECTED_SCHEMA).sort());
    expect(calls.find((c) => c.table === "reps")!.columns).toContain("setup_label");
    expect(calls.find((c) => c.table === "reps")!.columns).toContain("entry_price");
  });

  it("어긋난 테이블만 골라 알려준다 (컬럼 없음 등)", async () => {
    const issues = await checkSchema(fakeClient({ reps: "column reps.setup_label does not exist" }));
    expect(issues).toEqual([{ table: "reps", detail: "column reps.setup_label does not exist" }]);
  });

  it("여러 곳이 어긋나면 모두 알려준다", async () => {
    const issues = await checkSchema(fakeClient({ reps: "x", reveal_surveys: "y" }));
    expect(issues.map((i) => i.table).sort()).toEqual(["reps", "reveal_surveys"]);
  });

  it("점검 중 네트워크 예외가 나도 던지지 않고 문제로 보고한다", async () => {
    const boom: SchemaProbeClient = {
      from: () => ({
        select: () => ({
          limit: () => {
            throw new Error("fetch failed");
          },
        }),
      }),
    };
    const issues = await checkSchema(boom, { reps: ["id"] });
    expect(issues).toEqual([{ table: "reps", detail: "fetch failed" }]);
  });
});

/**
 * 마이그레이션에 새 테이블·컬럼이 생겼는데 EXPECTED_SCHEMA에 안 넣으면 실패한다.
 * (점검 목록이 낡아서 새 DDL 누락을 못 잡는 일을 막는다.)
 */
describe("EXPECTED_SCHEMA가 마이그레이션과 맞는다", () => {
  const dir = path.join(process.cwd(), "supabase/migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(path.join(dir, f), "utf8").replace(/--.*$/gm, ""))
    .join("\n");

  it("create table로 만든 모든 public 테이블이 목록에 있다", () => {
    const tables = [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) expect(Object.keys(EXPECTED_SCHEMA), `테이블 ${t}`).toContain(t);
  });

  it("create table 안의 모든 컬럼이 목록에 있다", () => {
    for (const m of sql.matchAll(/create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
      const [, table, body] = m;
      const cols = body
        .split("\n")
        .map((l) => l.trim().match(/^([a-z_]+)\s+(?:uuid|text|numeric|boolean|smallint|integer|bigint|timestamptz)\b/i)?.[1])
        .filter((c): c is string => !!c);
      expect(cols.length, `테이블 ${table}`).toBeGreaterThan(0);
      for (const c of cols) expect(EXPECTED_SCHEMA[table], `${table}.${c}`).toContain(c);
    }
  });

  it("alter table … add column으로 추가된 컬럼이 목록에 있다", () => {
    const alters = [...sql.matchAll(/alter table public\.(\w+)\s+((?:add column[^;]*)+);/gi)];
    expect(alters.length).toBeGreaterThan(0);
    for (const [, table, body] of alters) {
      for (const c of body.matchAll(/add column (?:if not exists )?(\w+)/gi)) {
        expect(EXPECTED_SCHEMA[table], `${table}.${c[1]}`).toContain(c[1]);
      }
    }
  });
});
