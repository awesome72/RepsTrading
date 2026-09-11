import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Term } from "@/components/term";

const steps = [
  {
    no: "①",
    title: "미리 적기",
    body: (
      <>
        사기 전에 <Term id="set-up">셋업</Term>과{" "}
        <Term id="son-jeol">손절</Term> 가격을 적고 잠급니다.
      </>
    ),
  },
  {
    no: "②",
    title: "가리고 하기",
    body: <>판단 이후의 차트는 절대 보여주지 않습니다.</>,
  },
  {
    no: "③",
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
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-8 py-6 md:min-h-[calc(100dvh-3.5rem-4rem)]">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="max-w-2xl text-[40px] font-bold leading-[1.15] tracking-[-0.5px] text-foreground sm:text-[48px]">
          연습 횟수를 성적표로 바꿉니다
        </h1>
        <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
          차트를 보고 판단하고, 결과를 보기 전에 스스로 채점합니다.
          <br />
          실전에 나갈 시점은 기분이 아니라 숫자가 정합니다.
        </p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {steps.map((step, i) => (
          <Fragment key={step.title}>
            <Card className="gap-2 rounded-lg border-border bg-card px-5 py-4 shadow-none">
              <div className="font-mono text-sm text-primary">{step.no}</div>
              <div className="text-[15px] font-semibold text-foreground">
                {step.title}
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </Card>
            {i < steps.length - 1 && (
              <ArrowRight
                className="mx-auto hidden text-muted-foreground md:block"
                size={20}
              />
            )}
          </Fragment>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-full px-8 text-[15px]">
            <Link href="/onboarding">5분 만에 첫 연습 시작</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-full px-8 text-[15px]"
          >
            <Link href="/tutorial">사용법 먼저 보기 (2분)</Link>
          </Button>
        </div>
        <p className="max-w-md text-center text-[12px] leading-relaxed text-muted-foreground">
          실제 주문이 실행되지 않는 연습용 서비스입니다. 투자 자문이 아닙니다.
        </p>
      </div>
    </div>
  );
}
