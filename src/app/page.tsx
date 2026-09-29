import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/term";
import { HeroMockup } from "@/components/landing/hero-mockup";

const steps = [
  {
    no: "01",
    title: "미리 적기",
    body: (
      <>
        사기 전에 <Term id="set-up">셋업</Term>과{" "}
        <Term id="son-jeol">손절</Term> 가격을 적고 잠급니다.
      </>
    ),
  },
  {
    no: "02",
    title: "가리고 하기",
    body: <>판단 이후의 차트는 절대 보여주지 않습니다.</>,
  },
  {
    no: "03",
    title: "먼저 채점",
    body: (
      <>
        손익을 보기 전에 내 <Term id="jun-su-yul">준수율</Term>부터
        채점합니다.
      </>
    ),
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-16 py-10 md:gap-24 md:py-20">
      <section className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <span className="eyebrow text-primary">트레이딩 판단력 훈련</span>
          <h1 className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[56px]">
            연습 횟수를
            <br />
            성적표로 바꿉니다
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
            차트를 보고 판단하고, 결과를 보기 전에 스스로 채점합니다. 실전에 나갈 시점은 기분이 아니라
            숫자가 정합니다.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-[15px] font-semibold">
              <Link href="/onboarding">
                5분 만에 첫 연습 시작 <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="h-12 rounded-full px-5 text-[15px] text-muted-foreground"
            >
              <Link href="/tutorial">사용법 먼저 보기 · 2분</Link>
            </Button>
          </div>
          <p className="text-[12px] text-muted-foreground">가입 없이 바로 5회까지 연습할 수 있습니다.</p>
        </div>

        <div className="px-2 sm:px-6 lg:px-0">
          <HeroMockup />
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="flex flex-col gap-3 bg-background p-6 md:p-8">
            <span className="num text-[13px] text-primary">{step.no}</span>
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">{step.title}</h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
