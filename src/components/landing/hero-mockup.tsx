import { Lock } from "lucide-react";
import { DECISION_INDEX, generateScenario } from "@/lib/market/scenario";
import { smaSeries } from "@/lib/market/indicators";

/**
 * 랜딩 히어로의 제품 목업. 그림이 아니라 실제 시나리오 생성기가 만든 봉을 서버에서 SVG로 그린다
 * (클라이언트 JS 0). 판단 시점 이후는 빗금으로 가려 "가리고 하기"를 한눈에 보여준다.
 * 눌림목 시드 중 추세·되돌림이 보기 좋은 것을 골랐다 — 바꾸려면 setupLabelForSeed로 확인할 것.
 */
const SEED = 30;
const VISIBLE = 64;
const HIDDEN_SLOTS = 22;

const W = 640;
const H = 340;
const PAD_T = 24;
const PAD_B = 24;
const PAD_R = 76;

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export function HeroMockup() {
  const scenario = generateScenario(SEED);
  const start = DECISION_INDEX - VISIBLE;
  const candles = scenario.candles.slice(start, DECISION_INDEX);
  const ma = smaSeries(scenario.candles.slice(0, DECISION_INDEX), 20).slice(start);

  const entry = candles[candles.length - 1].close;
  const stop = Math.round(entry * 0.97);
  const target = entry + (entry - stop) * 2;

  const lo = Math.min(stop, ...candles.map((c) => c.low));
  const hi = Math.max(target, ...candles.map((c) => c.high));
  const pad = (hi - lo) * 0.06;
  const min = lo - pad;
  const max = hi + pad;

  const slots = VISIBLE + HIDDEN_SLOTS;
  const plotW = W - PAD_R;
  const step = plotW / slots;
  const bodyW = Math.max(2, step * 0.62);
  const y = (p: number) => PAD_T + ((max - p) / (max - min)) * (H - PAD_T - PAD_B);
  const x = (i: number) => i * step + step / 2;
  const maskX = VISIBLE * step;

  const maPath = ma
    .map((v, i) => (v === undefined ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");

  const lines = [
    { price: target, label: "목표", tone: "var(--up)" },
    { price: entry, label: "진입", tone: "var(--body-text)" },
    { price: stop, label: "손절", tone: "var(--down)" },
  ];

  return (
    <div className="relative">
      {/* 뒤에 깔리는 옅은 빛 — 목업이 배경에서 떠 보이게 */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_10%,transparent),transparent)] blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-surface-2" />
            <span className="size-2 rounded-full bg-surface-2" />
            <span className="size-2 rounded-full bg-surface-2" />
          </div>
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground">연습 #5C63</span>
          <span className="w-10" />
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="판단 시점까지 공개된 차트와 가려진 이후 구간">
          <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--hairline)" strokeWidth="3" />
            </pattern>
          </defs>

          {candles.map((c, i) => {
            const up = c.close >= c.open;
            const color = up ? "var(--up)" : "var(--down)";
            const top = y(Math.max(c.open, c.close));
            const bottom = y(Math.min(c.open, c.close));
            return (
              <g key={i}>
                <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
                <rect x={x(i) - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} fill={color} />
              </g>
            );
          })}

          <polyline points={maPath} fill="none" stroke="var(--body-text)" strokeOpacity={0.45} strokeWidth={1.25} />

          {/* 판단 이후 — 가려진 구간 */}
          <rect x={maskX} y={0} width={plotW - maskX} height={H} fill="url(#hatch)" opacity={0.7} />
          <line x1={maskX} x2={maskX} y1={0} y2={H} stroke="var(--brand)" strokeOpacity={0.5} strokeDasharray="3 4" />

          {lines.map((l) => (
            <g key={l.label}>
              <line
                x1={0}
                x2={plotW}
                y1={y(l.price)}
                y2={y(l.price)}
                stroke={l.tone}
                strokeOpacity={0.7}
                strokeDasharray="4 4"
              />
              <rect x={plotW + 6} y={y(l.price) - 10} width={PAD_R - 10} height={20} rx={4} fill={l.tone} fillOpacity={0.14} />
              <text
                x={plotW + 12}
                y={y(l.price) + 4}
                fontSize={11}
                fill={l.tone}
                fontFamily="var(--font-jetbrains-mono)"
              >
                {won(l.price)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 떠 있는 계획 카드 — 사기 전에 적고 잠근다 */}
      <div className="absolute left-4 top-16 w-48 rounded-xl border border-border bg-background/90 p-3.5 shadow-xl shadow-black/50 backdrop-blur sm:-left-6 sm:top-20 sm:w-52">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="eyebrow text-muted-foreground">계획</span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <Lock size={11} strokeWidth={2.5} /> 잠김
          </span>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px]">
          <dt className="text-muted-foreground">셋업</dt>
          <dd className="text-right font-medium text-foreground">눌림목</dd>
          <dt className="text-muted-foreground">손절</dt>
          <dd className="num text-right text-down">{won(stop)}</dd>
          <dt className="text-muted-foreground">목표</dt>
          <dd className="num text-right text-up">2R</dd>
        </dl>
      </div>

      {/* 가려진 구간 안내 */}
      <div
        className="absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center sm:flex"
        style={{ left: `${(((maskX + plotW) / 2) / W) * 100}%` }}
      >
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-background/80">
          <Lock size={14} className="text-muted-foreground" />
        </span>
        <span className="text-[11px] leading-tight text-muted-foreground">
          판단 이후는
          <br />
          가려집니다
        </span>
      </div>
    </div>
  );
}
