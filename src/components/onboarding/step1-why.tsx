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
      <h1 className="max-w-lg text-[24px] font-bold leading-snug text-foreground">
        혼자 주식을 하면 실력이 늘지 않는 이유가 있습니다.
      </h1>
      <div className="grid w-full gap-3 sm:grid-cols-3">
        {REASONS.map((r) => (
          <div key={r.title} className="rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-[14px] font-semibold text-foreground">{r.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>
      <p className="text-[15px] font-semibold text-primary">
        그래서 이 서비스는 순서를 바꿉니다
      </p>
    </div>
  );
}
