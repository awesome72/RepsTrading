import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rebuildPlan } from "@/lib/rep/server-guard";
import { AdviceError, generateAdvice, type AdviceFacts } from "@/lib/ai/advisor";
import type { SetupChoice } from "@/lib/rep/types";
import type { SetupLabel } from "@/lib/market/scenario";

const SETUP_CHOICE_LABEL: Record<SetupChoice, string> = {
  pullback: "눌림목",
  breakout: "돌파",
  other: "기타",
};
const SETUP_ANSWER_LABEL: Record<SetupLabel, string> = {
  pullback: "눌림목",
  breakout: "돌파",
  none: "셋업 없음",
};

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_REQUESTS = 5;

/**
 * 결과 공개 후 사용자가 직접 요청할 때만 호출되는 AI 코치 조언.
 * 매 판단마다 자동으로 뜨는 즉시 피드백(lib/feedback/rules.ts)과는 다른 별도 기능이다 —
 * 그쪽은 "LLM 호출 금지" 원칙을 그대로 지킨다. 로그인한 사용자만 쓸 수 있다(비용·게스트에는 서버 행이 없음).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 짧은 시간에 반복 호출로 Anthropic API 비용이 늘어나는 것을 막는다.
  // 마이그레이션이 아직 적용되지 않아 테이블이 없으면(개발 환경 등) 제한 없이 통과시킨다.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: rateLimitError } = await supabase
    .from("ai_advice_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (!rateLimitError && (count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      {
        error: `AI 조언 요청이 너무 많습니다. ${RATE_LIMIT_WINDOW_MINUTES}분 후 다시 시도해주세요.`,
      },
      { status: 429 }
    );
  }
  await supabase.from("ai_advice_requests").insert({ user_id: user.id });

  const { data: rep, error: fetchError } = await supabase
    .from("reps")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !rep) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }
  // 결과 잠금과 같은 경계: 채점 전에는 R도 정답 셋업도 아직 알려줄 수 없다
  if (rep.state !== "GRADED" && rep.state !== "REVEALED") {
    return NextResponse.json({ error: "아직 결과를 알 수 없는 연습입니다." }, { status: 409 });
  }

  const { scenario, plan } = rebuildPlan(rep);
  const setupCorrect =
    rep.exit_reason === "pass" ? scenario.setupLabel === "none" : rep.plan_setup === scenario.setupLabel;

  const facts: AdviceFacts = {
    exitReason: rep.exit_reason,
    chosenSetupLabel: rep.exit_reason === "pass" ? "지나감" : SETUP_CHOICE_LABEL[rep.plan_setup as SetupChoice],
    correctSetupLabel: SETUP_ANSWER_LABEL[scenario.setupLabel],
    setupCorrect,
    decisionGrade: rep.decision_grade,
    adhered: rep.adhered,
    rMultiple: rep.r_result,
    targetR: plan.targetR,
    inputSeconds: rep.input_seconds ?? null,
  };

  try {
    const advice = await generateAdvice(facts);
    return NextResponse.json({ advice });
  } catch (e) {
    if (e instanceof AdviceError) {
      if (e.code === "rate_limited") {
        return NextResponse.json(
          { error: "지금 요청이 많습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "AI 조언을 가져오지 못했습니다. 잠시 후 다시 시도해주세요." },
        { status: 502 }
      );
    }
    console.error("advice generation failed", e);
    return NextResponse.json({ error: "AI 조언을 가져오지 못했습니다." }, { status: 500 });
  }
}
