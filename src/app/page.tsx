import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Ban, Ruler, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/term";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { LandingQuiz } from "@/components/landing/landing-quiz";

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

/** 하지 않는 것 — 이 서비스의 원칙을 기능 목록 대신 "안 하는 것"으로 보여준다 */
const nots = [
  { icon: Ban, title: "종목을 추천하지 않습니다", body: "실제 종목이 아닌 가상 차트로 판단력만 훈련합니다." },
  {
    icon: Ruler,
    title: "돈 대신 R로 셉니다",
    body: (
      <>
        성과는 원화 손익이 아니라 <Term id="r-multiple">R</Term>(손절폭 = 1R) 단위로만 보여줍니다.
      </>
    ),
  },
  { icon: Users, title: "순위·포인트가 없습니다", body: "남과 비교하지 않습니다. 기준은 내 기록의 숫자뿐입니다." },
];

// 제목·설명은 루트 레이아웃 기본값을 쓴다. canonical만 홈에 직접 둔다 — 루트에 두면 404 등 자기 레이아웃이
// 없는 화면까지 홈을 canonical로 물려받는다.
export const metadata: Metadata = { alternates: { canonical: "/" } };

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

export default function Home() {
  return (
    <div className="flex flex-col gap-20 py-10 md:gap-28 md:py-20">
      <section className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <span className="anim-rise eyebrow text-primary">트레이딩 판단력 훈련</span>
          <h1
            className="anim-rise text-[40px] font-bold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[56px]"
            style={delay(80)}
          >
            연습 횟수를
            <br />
            성적표로 바꿉니다
          </h1>
          <p
            // 폰트가 도착하며 줄바꿈이 바뀌어도 아래 목업이 밀리지 않게 3줄 높이를 미리 잡아둔다 (CLS)
            className="anim-rise min-h-[4.9em] max-w-md text-[15px] leading-relaxed text-muted-foreground sm:min-h-0 sm:text-[16px]"
            style={delay(160)}
          >
            차트를 보고 판단하고, 결과를 보기 전에 스스로 채점합니다. 실전에 나갈 시점은 기분이 아니라
            숫자가 정합니다.
          </p>
          {/* 폰에서는 항상 두 줄로 쌓는다 — 한 줄에 들어가는지가 폰트(대체 폰트 ↔ Pretendard)에 따라 달라져
              폰트가 도착하는 순간 아래 전체가 60px 튀어 올랐다 (CLS 0.16) */}
          <div
            className="anim-rise flex w-full flex-col items-stretch gap-2 pt-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
            style={delay(240)}
          >
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
              <Link href="#try">30초 체험해보기</Link>
            </Button>
          </div>
          <p className="anim-rise text-[12px] text-muted-foreground" style={delay(320)}>
            가입 없이 바로 5회까지 연습할 수 있습니다.
          </p>
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

      <section id="try" className="flex scroll-mt-24 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-primary">30초 체험</span>
          <h2 className="text-[26px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">
            이 차트, 당신이라면 어떻게 보겠습니까?
          </h2>
          <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">
            가입하지 않아도 됩니다. 하나를 고르면 바로 정답과, 가려져 있던 그 뒤의 움직임을 보여드립니다.
          </p>
        </div>
        <LandingQuiz />
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-muted-foreground">하지 않는 것</span>
          <h2 className="text-[26px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">
            흥분시키는 것들을 뺐습니다
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3 md:gap-10">
          {nots.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-3 border-t border-border pt-5">
              <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="text-[16px] font-semibold text-foreground">{title}</h3>
              <p className="text-[14px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative isolate flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-border px-6 py-16 text-center">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--brand)_9%,transparent),transparent)]"
        />
        <h2 className="max-w-xl text-[28px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[36px]">
          숫자가 &lsquo;준비됐다&rsquo;고 말할 때까지
        </h2>
        <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
          실행 → 판별 → 전환, 세 단계 기준을 넘으면 그때가 실전을 생각할 시점입니다.
        </p>
        <Button asChild size="lg" className="h-12 rounded-full px-7 text-[15px] font-semibold">
          <Link href="/onboarding">
            첫 연습 시작 <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
