import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decideGateTransition } from "@/lib/gate/rules";
import { serverRepToRep, type ServerRep } from "@/lib/rep/api";
import type { GateLevel } from "@/lib/gate/types";

/**
 * 게이트 승급·강등은 서버에 저장된 기록만으로 판정한다.
 * 어느 기기에서 연습했든 같은 기록이면 같은 단계가 나온다.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [repsRes, gateRes] = await Promise.all([
    supabase.from("reps").select("*").in("state", ["GRADED", "REVEALED"]),
    supabase.from("gate_progress").select("gate_level").eq("user_id", user.id).maybeSingle(),
  ]);
  if (repsRes.error || gateRes.error) {
    return NextResponse.json(
      { error: (repsRes.error ?? gateRes.error)!.message },
      { status: 500 }
    );
  }

  const level = (gateRes.data?.gate_level ?? 1) as GateLevel;
  const reps = (repsRes.data as ServerRep[]).map(serverRepToRep);
  const transition = decideGateTransition(level, reps);

  if (transition) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("gate_progress").upsert({
      user_id: user.id,
      gate_level: transition.to,
      ...(transition.kind === "promotion" ? { last_promoted_at: now } : { last_demoted_at: now }),
      updated_at: now,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ gateLevel: transition?.to ?? level, transition });
}
