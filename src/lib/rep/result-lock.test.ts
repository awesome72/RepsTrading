import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { RESULT_LOCKED_FIELDS, isResultVisible, stripUngradedResult } from "./result-lock";

const row = (state: string) => ({
  id: "r1",
  state,
  plan_stop: 90,
  plan_target_r: 2,
  exit_reason: "stop",
  exit_price: 88,
  r_result: -1,
  setup_label: "pullback",
});

describe("isResultVisible", () => {
  it("GRADED·REVEALED만 true", () => {
    expect(isResultVisible("GRADED")).toBe(true);
    expect(isResultVisible("REVEALED")).toBe(true);
    expect(isResultVisible("COMMITTED")).toBe(false);
    expect(isResultVisible("EXECUTED")).toBe(false);
  });

  it("모르는 값·빈 값이면 잠근다", () => {
    expect(isResultVisible(undefined)).toBe(false);
    expect(isResultVisible("revealed")).toBe(false);
    expect(isResultVisible(null)).toBe(false);
  });
});

describe("stripUngradedResult", () => {
  it.each(["COMMITTED", "EXECUTED"])("%s: 결과·정답 필드를 모두 지운다", (state) => {
    const out = stripUngradedResult(row(state));
    for (const f of RESULT_LOCKED_FIELDS) expect(out).not.toHaveProperty(f);
  });

  it("채점 전이어도 결과가 아닌 필드는 그대로 둔다", () => {
    const out = stripUngradedResult(row("EXECUTED"));
    expect(out).toMatchObject({ id: "r1", state: "EXECUTED", plan_stop: 90, plan_target_r: 2, exit_reason: "stop" });
  });

  it.each(["GRADED", "REVEALED"])("%s: 결과를 그대로 보여준다", (state) => {
    expect(stripUngradedResult(row(state))).toEqual(row(state));
  });

  it("입력 객체를 바꾸지 않는다", () => {
    const input = row("COMMITTED");
    stripUngradedResult(input);
    expect(input.r_result).toBe(-1);
    expect(input.setup_label).toBe("pullback");
  });

  it("state가 없는 행도 잠근다", () => {
    const { state: _s, ...noState } = row("GRADED");
    void _s;
    expect(stripUngradedResult(noState)).not.toHaveProperty("r_result");
  });
});

/**
 * 회귀 방지: reps 행 전체(select("*"))를 읽는 API 라우트는 stripUngradedResult를 써야 한다.
 * 행을 응답에 싣지 않는 라우트만 아래 예외 목록에 이유와 함께 둔다.
 */
const EXEMPT: Record<string, string> = {
  "reps/[id]/execute/route.ts": "행을 검증에만 쓰고 { state }만 응답한다",
  "reps/[id]/grade/route.ts": "채점이 끝난 뒤(REVEALED)의 결과만 응답한다",
  "reps/[id]/advice/route.ts": "GRADED/REVEALED 확인 후 조언 텍스트만 응답한다",
  "reps/summary/route.ts": "GRADED/REVEALED 행만 읽어 계산된 숫자만 응답한다",
  "account/gate/route.ts": "GRADED/REVEALED 행만 읽어 단계 판정 결과만 응답한다",
};

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === "route.ts" ? [full] : [];
  });
}

describe("API 라우트 결과 잠금", () => {
  const apiDir = path.join(process.cwd(), "src/app/api");

  it("reps 행을 통째로 읽는 라우트는 stripUngradedResult를 쓰거나 예외 목록에 있다", () => {
    const offenders: string[] = [];
    for (const file of routeFiles(apiDir)) {
      const src = readFileSync(file, "utf8");
      const readsWholeRep = /from\("reps"\)[\s\S]{0,80}select\("\*"\)/.test(src);
      if (!readsWholeRep) continue;
      const rel = path.relative(apiDir, file).split(path.sep).join("/");
      if (EXEMPT[rel]) continue;
      if (!src.includes("stripUngradedResult")) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("예외 목록이 실제 파일을 가리킨다 (라우트를 옮기면 여기도 고칠 것)", () => {
    const rels = routeFiles(apiDir).map((f) => path.relative(apiDir, f).split(path.sep).join("/"));
    for (const e of Object.keys(EXEMPT)) expect(rels).toContain(e);
  });
});
