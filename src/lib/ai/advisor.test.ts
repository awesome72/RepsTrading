import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdviceFacts } from "./advisor";

type FakeEvent = { type: "content_block_delta"; delta: { type: "text_delta"; text: string } };

let queuedStreams: ReturnType<typeof fakeStream>[] = [];

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAnthropic {
    messages = { stream: vi.fn(() => queuedStreams.shift()) };
  }
  class RateLimitError extends Error {}
  class APIError extends Error {}
  return { default: Object.assign(FakeAnthropic, { RateLimitError, APIError }) };
});

function fakeStream(events: FakeEvent[], stopReason: string) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const e of events) yield e;
    },
    finalMessage: async () => ({ stop_reason: stopReason }),
    abort: vi.fn(),
  };
}

function delta(text: string): FakeEvent {
  return { type: "content_block_delta", delta: { type: "text_delta", text } };
}

const FACTS: AdviceFacts = {
  exitReason: "target",
  chosenSetupLabel: "눌림목",
  correctSetupLabel: "눌림목",
  setupCorrect: true,
  decisionGrade: "A",
  adhered: true,
  rMultiple: 2,
  targetR: 2,
  inputSeconds: 10,
};

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = "";
  for await (const chunk of gen) out += chunk;
  return out;
}

beforeEach(() => {
  queuedStreams = [];
  vi.resetModules();
});

describe("streamAdvice — 거부 시 폴백", () => {
  it("1차 모델이 첫 글자 전에 거부하면 다른 모델로 한 번 더 시도해 그 결과를 낸다", async () => {
    const { streamAdvice } = await import("./advisor");
    queuedStreams.push(fakeStream([], "refusal")); // 1차: 아무것도 못 내놓고 거부
    queuedStreams.push(fakeStream([delta("안전한 조언입니다.")], "end_turn")); // 폴백: 성공

    const text = await collect(streamAdvice(FACTS));
    expect(text).toBe("안전한 조언입니다.");
    expect(queuedStreams).toHaveLength(0);
  });

  it("1차 모델이 정상 응답하면 폴백을 시도하지 않는다", async () => {
    const { streamAdvice } = await import("./advisor");
    queuedStreams.push(fakeStream([delta("정상 조언")], "end_turn"));
    queuedStreams.push(fakeStream([], "refusal")); // 소비되지 않아야 한다

    const text = await collect(streamAdvice(FACTS));
    expect(text).toBe("정상 조언");
    expect(queuedStreams).toHaveLength(1); // 폴백 스트림이 그대로 남아있다 = 호출 안 됨
  });

  it("첫 글자를 이미 보낸 뒤에 거부로 끝나면 재시도하지 않고 에러를 그대로 던진다", async () => {
    const { streamAdvice, AdviceError } = await import("./advisor");
    queuedStreams.push(fakeStream([delta("일부")], "refusal"));

    const gen = streamAdvice(FACTS);
    const first = await gen.next();
    expect(first.value).toBe("일부");
    await expect(gen.next()).rejects.toBeInstanceOf(AdviceError);
    expect(queuedStreams).toHaveLength(0); // 폴백을 시도하지 않았다(애초에 큐에 넣지도 않음)
  });
});
