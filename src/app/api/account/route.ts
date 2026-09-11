import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSettings, type AccountSettings, type ServerAccount } from "@/lib/account/api";
import type { GateLevel } from "@/lib/gate/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [profile, gate] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("gate_progress").select("gate_level").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profile.error || gate.error) {
    return NextResponse.json(
      { error: (profile.error ?? gate.error)!.message },
      { status: 500 }
    );
  }

  const row = profile.data;
  const body: ServerAccount = {
    settings: row
      ? {
          accountSize: Number(row.account_size),
          riskPercent: Number(row.risk_percent),
          setupPreference: row.setup_preference,
          onboardingCompleted: row.onboarding_completed,
          updatedAt: new Date(row.updated_at).getTime(),
        }
      : null,
    gateLevel: (gate.data?.gate_level ?? 1) as GateLevel,
  };
  return NextResponse.json(body);
}

/** 계좌 설정만 저장한다. 게이트 단계는 /api/account/gate가 서버에서 판정해 기록한다. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<AccountSettings>;
  if (!isValidSettings(body)) {
    return NextResponse.json({ error: "잘못된 설정 값입니다." }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("users").upsert({
    id: user.id,
    account_size: body.accountSize,
    risk_percent: body.riskPercent,
    setup_preference: body.setupPreference,
    onboarding_completed: body.onboardingCompleted,
    updated_at: updatedAt,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updatedAt: new Date(updatedAt).getTime() });
}
