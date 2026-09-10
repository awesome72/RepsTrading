import { cn } from "@/lib/utils";

const GATES = [
  { level: 1, label: "실행", desc: "같은 전략 하나만 300번 반복" },
  { level: 2, label: "판별", desc: "전략 3개를 섞어서 300번 더" },
  { level: 3, label: "전환", desc: "실제 돈으로 소액 100번 (실계좌 연동 필요)" },
];

export function Step5Plan() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-[24px] font-bold text-foreground">앞으로의 계획</h1>

      <div className="flex w-full max-w-lg flex-col gap-2">
        {GATES.map((g, i) => (
          <div
            key={g.level}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left",
              i === 0 ? "border-primary bg-primary/10" : "border-border bg-card"
            )}
          >
            <span
              className={cn(
                "num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                i === 0 ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
              )}
            >
              G{g.level}
            </span>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{g.label}</p>
              <p className="text-[12px] text-muted-foreground">{g.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-4 text-[13px] leading-relaxed">
        <p className="font-semibold text-foreground">1단계 목표: 300회</p>
        <p className="mt-1 text-muted-foreground">
          하루 10번씩 하면 한 달이면 도달합니다.
        </p>
      </div>
    </div>
  );
}
