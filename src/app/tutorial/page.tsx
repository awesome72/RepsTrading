import type { Metadata } from "next";
import { TutorialPlayer } from "@/components/tutorial/tutorial-player";

export const metadata: Metadata = {
  title: "사용법 — REPS",
  description: "REPS를 처음 쓰는 분을 위한 화면·음성·자막 사용법 안내입니다.",
};

export default function TutorialPage() {
  return <TutorialPlayer />;
}
