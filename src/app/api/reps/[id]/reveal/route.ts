import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: rep, error: fetchError } = await supabase
    .from("reps")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !rep) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }
  if (rep.state !== "GRADED") {
    return NextResponse.json(
      { error: `잘못된 상태 전이입니다: ${rep.state} → REVEALED` },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabase
    .from("reps")
    .update({ state: "REVEALED" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ...rep, state: "REVEALED" });
}
