import Anthropic from "@anthropic-ai/sdk";
import type { DecisionGrade, ExitReason } from "@/lib/rep/types";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // 지연 생성 — 빌드/테스트 시점에는 ANTHROPIC_API_KEY가 없어도 이 모듈을 import할 수 있어야 한다
  if (!client) client = new Anthropic();
  return client;
}

const MODEL = "claude-opus-5";
/** 1차 모델이 안전상 거부하면(아직 한 글자도 못 보낸 경우에 한해) 한 번 더 시도할 모델 */
const FALLBACK_MODEL = "claude-sonnet-5";

const EXIT_LABEL: Record<ExitReason, string> = {
  stop: "손절가 도달",
  target: "목표가 도달",
  manual: "직접 청산",
  timeout: "시간 초과",
  pass: "지나감 (매수하지 않음)",
};

export type AdviceFacts = {
  exitReason: ExitReason;
  /** 사용자가 고른 셋업, 또는 "지나감" */
  chosenSetupLabel: string;
  /** 이 차트의 정답 셋업 */
  correctSetupLabel: string;
  setupCorrect: boolean;
  decisionGrade: DecisionGrade;
  adhered: boolean;
  rMultiple: number;
  targetR: number;
  inputSeconds: number | null;
};

/**
 * REPS는 가상 데이터로 매매 "판단력"을 훈련하는 도구다. 이 조언은 그 판단을 코칭하는 것이지
 * 실제 투자를 자문하는 게 아니다 — 이 경계를 모델이 스스로 지키게 한다.
 */
const SYSTEM_PROMPT = `당신은 REPS라는 한국어 트레이딩 연습 앱의 코치입니다. REPS는 실제 돈이 아닌 가상 데이터로 차트를 읽고 판단하는 훈련 도구이며, 실제 증권 매매를 추천하거나 실제 시장을 예측하지 않습니다.

당신의 역할은 방금 끝난 연습 1회에 대해, 주어진 사실만 근거로 짧은 코칭 조언을 한국어로 쓰는 것입니다.

규칙:
- 3~5문장, 평서문. 마크다운·글머리 기호·이모지를 쓰지 마세요.
- 반드시 주어진 사실(셋업 정답 여부, 계획 준수 등급, R 결과)을 구체적으로 언급하세요. 일반적인 매매 격언을 늘어놓지 마세요.
- 등급이 A·B(계획 준수)인데 R이 음수이거나, 등급이 C·D(계획 이탈)인데 R이 양수라면 그 엇갈림을 반드시 짚어주세요 — 운과 실력을 구별하는 것이 이 앱의 핵심입니다.
- 마지막 한 문장은 다음 연습에서 시도해볼 구체적인 행동 하나만 제안하세요. 여러 개를 나열하지 마세요.
- 실제 종목·실제 매수매도 타이밍을 언급하거나 투자를 권유하지 마세요. 이건 연습용 가상 데이터에 대한 코칭입니다.`;

/** 조언 API가 한 줄에 하나씩 보내는 스트림 이벤트 (NDJSON) */
export type AdviceStreamEvent =
  | { t: "delta"; text: string }
  | { t: "done" }
  | { t: "error"; message: string };

export class AdviceError extends Error {
  constructor(public code: "rate_limited" | "unavailable" | "refused") {
    super(code);
  }
}

function buildFactsMessage(f: AdviceFacts): string {
  const lines = [
    `청산 방식: ${EXIT_LABEL[f.exitReason]}`,
    `선택한 셋업: ${f.chosenSetupLabel}`,
    `정답 셋업: ${f.correctSetupLabel} (${f.setupCorrect ? "일치" : "불일치"})`,
    `채점 등급: ${f.decisionGrade} (${f.adhered ? "계획 준수" : "계획 이탈"})`,
    `결과: ${f.rMultiple >= 0 ? "+" : ""}${f.rMultiple.toFixed(2)}R (목표 ${f.targetR}R)`,
  ];
  if (f.inputSeconds !== null) lines.push(`계획 작성 시간: ${Math.round(f.inputSeconds)}초`);
  return `아래 사실을 바탕으로 이번 판단에 대한 코칭 조언을 써주세요.\n\n${lines.join("\n")}`;
}

/**
 * 조언을 글자 조각 단위로 흘려보낸다 — 12초가량 걸리는 응답을 빈 화면으로 기다리지 않게 한다.
 * SDK 에러는 AdviceError로 바꿔 던지고, 끝났는데 거부(refusal)였거나 글자가 하나도 없으면 역시 던진다.
 * 호출 쪽이 도중에 멈추면(return) 진행 중인 요청을 끊는다.
 */
async function* streamAdviceOnce(facts: AdviceFacts, model: string): AsyncGenerator<string> {
  const stream = getClient().messages.stream({
    model,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: buildFactsMessage(facts) }],
  });

  let finished = false;
  let produced = false;
  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        produced = true;
        yield event.delta.text;
      }
    }
    const message = await stream.finalMessage();
    finished = true;
    if (message.stop_reason === "refusal") throw new AdviceError("refused");
    if (!produced) throw new AdviceError("unavailable");
  } catch (e) {
    finished = true;
    if (e instanceof AdviceError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new AdviceError("rate_limited");
    if (e instanceof Anthropic.APIError) throw new AdviceError("unavailable");
    throw e;
  } finally {
    if (!finished) stream.abort();
  }
}

/**
 * 1차 모델이 첫 글자를 내놓기 전에 거부하면(아직 사용자에게 아무것도 보내지 않은 상태) 다른
 * 모델로 딱 한 번 더 시도한다 — 요청당 최대 2회 호출. 첫 글자가 나온 뒤의 실패는 이미 사용자가
 * 그 텍스트를 보고 있으므로 재시도하지 않는다(두 모델의 글이 섞여 보이는 걸 막기 위함).
 */
export async function* streamAdvice(facts: AdviceFacts): AsyncGenerator<string> {
  const primary = streamAdviceOnce(facts, MODEL);
  let first: IteratorResult<string>;
  try {
    first = await primary.next();
  } catch (e) {
    if (e instanceof AdviceError && e.code === "refused") {
      yield* streamAdviceOnce(facts, FALLBACK_MODEL);
      return;
    }
    throw e;
  }
  if (!first.done) yield first.value;
  yield* primary;
}
