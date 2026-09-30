import Link from "next/link";

const REASONS = [
  {
    title: "결과가 거짓말을 한다",
    desc: "엉터리로 산 종목이 오르고, 원칙대로 산 종목이 떨어집니다. 결과만 보고 배우면 반대로 배웁니다.",
  },
  {
    title: "피드백이 너무 늦다",
    desc: "한 번 사고 팔면 며칠~몇 주. 1년에 얻는 '연습 횟수'가 수십 번밖에 되지 않습니다.",
  },
  {
    title: "기억이 조작된다",
    desc: '매매가 끝난 뒤에 이유를 붙입니다. "원래 그럴 줄 알았다"가 기록을 대체합니다.',
  },
];

export function Step1Why() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="max-w-lg text-[28px] font-bold leading-snug tracking-[-0.02em] text-foreground">
        혼자 주식을 하면 실력이 늘지 않는 이유가 있습니다.
      </h1>
      <div className="grid w-full gap-5 sm:grid-cols-3">
        {REASONS.map((r, i) => (
          <div key={r.title} className="flex flex-col gap-1.5 border-t border-border pt-4 text-left">
            <span className="num text-[11px] text-primary">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-[15px] font-semibold text-foreground">{r.title}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>
      <p className="pt-2 text-[17px] font-semibold text-foreground">
        그래서 이 서비스는 <span className="text-primary">순서를 바꿉니다</span>
      </p>
      <Link
        href="/tutorial"
        className="text-[12px] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
      >
        글 대신 2분짜리 영상으로 먼저 보기
      </Link>
    </div>
  );
}
