import { beforeEach, describe, expect, it, vi } from "vitest";
import { readGuestLog, clearGuestLog, useRepLogStore, GUEST_REP_LIMIT } from "./log-store";
import { apiListReps } from "./api";
import type { Rep } from "./types";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, apiListReps: vi.fn() };
});

const GUEST_LOG_KEY = "reps.guest.v1";

function fakeRep(id: string, overrides: Partial<Rep> = {}): Rep {
  return {
    id,
    scenarioId: id,
    seed: 1,
    setupLabel: "pullback",
    state: "REVEALED",
    openedAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(apiListReps).mockReset();
  // reset()이 store 상태뿐 아니라 refresh()의 in-flight 중복방지 카운터도 함께 리셋한다
  useRepLogStore.getState().reset();
});

describe("readGuestLog", () => {
  it("아무것도 없으면 빈 배열", () => {
    expect(readGuestLog()).toEqual([]);
  });

  it("저장된 게스트 기록을 그대로 돌려준다", () => {
    const reps = [fakeRep("a"), fakeRep("b")];
    localStorage.setItem(GUEST_LOG_KEY, JSON.stringify(reps));
    expect(readGuestLog()).toEqual(reps);
  });

  it("깨진 JSON이면 던지지 않고 빈 배열", () => {
    localStorage.setItem(GUEST_LOG_KEY, "{broken");
    expect(readGuestLog()).toEqual([]);
  });
});

describe("clearGuestLog", () => {
  it("저장된 게스트 기록을 지운다", () => {
    localStorage.setItem(GUEST_LOG_KEY, "[]");
    clearGuestLog();
    expect(localStorage.getItem(GUEST_LOG_KEY)).toBeNull();
  });

  it("접근이 막혀도 던지지 않는다", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearGuestLog()).not.toThrow();
    spy.mockRestore();
  });
});

describe("useRepLogStore — 게스트 모드", () => {
  it("loadGuest는 localStorage 기록을 불러오고 상태를 ready·guest로 만든다", () => {
    localStorage.setItem(GUEST_LOG_KEY, JSON.stringify([fakeRep("a")]));
    useRepLogStore.getState().loadGuest();

    const s = useRepLogStore.getState();
    expect(s.status).toBe("ready");
    expect(s.mode).toBe("guest");
    expect(s.reps).toEqual([fakeRep("a")]);
  });

  it("addRep은 화면에 반영하고 localStorage에도 저장한다", () => {
    useRepLogStore.getState().loadGuest();
    useRepLogStore.getState().addRep(fakeRep("new"));

    expect(useRepLogStore.getState().reps.map((r) => r.id)).toEqual(["new"]);
    const saved = JSON.parse(localStorage.getItem(GUEST_LOG_KEY)!);
    expect(saved.map((r: Rep) => r.id)).toEqual(["new"]);
  });

  it("removeRep은 화면과 localStorage 양쪽에서 뺀다", () => {
    localStorage.setItem(GUEST_LOG_KEY, JSON.stringify([fakeRep("a"), fakeRep("b")]));
    useRepLogStore.getState().loadGuest();
    useRepLogStore.getState().removeRep("a");

    expect(useRepLogStore.getState().reps.map((r) => r.id)).toEqual(["b"]);
    const saved = JSON.parse(localStorage.getItem(GUEST_LOG_KEY)!);
    expect(saved.map((r: Rep) => r.id)).toEqual(["b"]);
  });

  it("replaceRep은 같은 id의 기록만 새 값으로 바꾼다", () => {
    localStorage.setItem(GUEST_LOG_KEY, JSON.stringify([fakeRep("a", { decisionGrade: "C" })]));
    useRepLogStore.getState().loadGuest();
    useRepLogStore.getState().replaceRep("a", fakeRep("a", { decisionGrade: "A" }));

    expect(useRepLogStore.getState().reps[0].decisionGrade).toBe("A");
  });

  it("게스트 한도(GUEST_REP_LIMIT)는 5다 — 이 값을 쓰는 화면들과 어긋나지 않아야 한다", () => {
    expect(GUEST_REP_LIMIT).toBe(5);
  });
});

describe("useRepLogStore — 서버 모드(addRep은 localStorage에 안 쓴다)", () => {
  it("서버 모드에서 addRep은 화면에만 반영하고 localStorage는 건드리지 않는다", async () => {
    vi.mocked(apiListReps).mockResolvedValue([]);
    await useRepLogStore.getState().refresh();
    expect(useRepLogStore.getState().mode).toBe("server");

    useRepLogStore.getState().addRep(fakeRep("server-rep"));
    expect(useRepLogStore.getState().reps.map((r) => r.id)).toEqual(["server-rep"]);
    expect(localStorage.getItem(GUEST_LOG_KEY)).toBeNull();
  });
});

describe("useRepLogStore.refresh", () => {
  it("성공하면 committedAt(없으면 openedAt) 오름차순으로 정렬해 채운다", async () => {
    vi.mocked(apiListReps).mockResolvedValue([
      {
        id: "late",
        user_id: "u",
        setup_id: "pullback",
        scenario_seed: 1,
        state: "REVEALED",
        committed_at: new Date(2000).toISOString(),
        commit_hash: "h",
        plan_setup: "pullback",
        plan_stop: 90,
        plan_target_r: 2,
        created_at: new Date(2000).toISOString(),
      },
      {
        id: "early",
        user_id: "u",
        setup_id: "pullback",
        scenario_seed: 1,
        state: "REVEALED",
        committed_at: new Date(1000).toISOString(),
        commit_hash: "h",
        plan_setup: "pullback",
        plan_stop: 90,
        plan_target_r: 2,
        created_at: new Date(1000).toISOString(),
      },
    ]);

    await useRepLogStore.getState().refresh();

    const s = useRepLogStore.getState();
    expect(s.status).toBe("ready");
    expect(s.mode).toBe("server");
    expect(s.reps.map((r) => r.id)).toEqual(["early", "late"]);
  });

  it("동시에 여러 번 불려도 실제 요청은 한 번만 나간다", async () => {
    vi.mocked(apiListReps).mockResolvedValue([]);

    const [a, b, c] = [
      useRepLogStore.getState().refresh(),
      useRepLogStore.getState().refresh(),
      useRepLogStore.getState().refresh(),
    ];
    await Promise.all([a, b, c]);

    expect(apiListReps).toHaveBeenCalledTimes(1);
  });

  it("실패하면 status가 error가 된다(처음 로딩일 때)", async () => {
    vi.mocked(apiListReps).mockRejectedValue(new Error("network"));
    await useRepLogStore.getState().refresh();
    expect(useRepLogStore.getState().status).toBe("error");
  });

  it("이미 ready·server였다면 실패해도 기존 화면을 유지한다(status는 ready로 남는다)", async () => {
    vi.mocked(apiListReps).mockResolvedValue([]);
    await useRepLogStore.getState().refresh();
    expect(useRepLogStore.getState().status).toBe("ready");

    vi.mocked(apiListReps).mockRejectedValue(new Error("network"));
    await useRepLogStore.getState().refresh();
    expect(useRepLogStore.getState().status).toBe("ready");
  });
});

describe("useRepLogStore.reset", () => {
  it("기록을 비우고 idle·mode null로 되돌린다 — 로그아웃 시 다른 사용자 기록이 안 남게", () => {
    useRepLogStore.setState({ reps: [fakeRep("a")], status: "ready", mode: "server" });
    useRepLogStore.getState().reset();

    const s = useRepLogStore.getState();
    expect(s.reps).toEqual([]);
    expect(s.status).toBe("idle");
    expect(s.mode).toBeNull();
  });
});
