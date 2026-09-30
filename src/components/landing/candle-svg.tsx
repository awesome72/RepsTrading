import type { Candle } from "@/lib/market/generator";

/**
 * 랜딩 전용 가벼운 캔들 SVG — lightweight-charts(수십 kB)를 랜딩에 싣지 않으려고 따로 둔다.
 * 훅이 없어서 서버 컴포넌트(목업)와 클라이언트 컴포넌트(체험 퀴즈) 양쪽에서 쓴다.
 * 연습 화면의 실제 차트는 여전히 BlindChart다.
 */

export type SvgPriceLine = { price: number; tone: "up" | "down" | "neutral"; label: string };

const TONE: Record<SvgPriceLine["tone"], string> = {
  up: "var(--up)",
  down: "var(--down)",
  neutral: "var(--body-text)",
};

type CandleSvgProps = {
  candles: Candle[];
  /** candles와 같은 길이의 이동평균 (앞부분은 undefined) */
  ma?: (number | undefined)[];
  /** 가로 칸 수 — candles보다 크면 오른쪽이 빈다(가려진 구간 자리) */
  slots: number;
  lines?: SvgPriceLine[];
  /** 이 칸부터 오른쪽을 빗금으로 가린다 */
  maskFrom?: number;
  /** 가리지는 않고 이 칸에 판단 지점 구분선만 긋는다 (정답 공개 뒤) */
  markAt?: number;
  /** 첫 그리기 애니메이션 — 캔들이 왼쪽부터 차례로 올라온다 */
  animateIn?: boolean;
  /** 이 인덱스부터의 캔들만 "새로 공개된" 애니메이션을 준다 (퀴즈 정답 뒤 이어지는 봉) */
  revealFrom?: number;
  /** 가격 범위를 고정하고 싶을 때 (정답 전후로 축이 튀지 않게) */
  range?: { min: number; max: number };
  width?: number;
  height?: number;
  padRight?: number;
  ariaLabel: string;
};

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export function priceRange(candles: Candle[], extra: number[] = []) {
  const lo = Math.min(...extra, ...candles.map((c) => c.low));
  const hi = Math.max(...extra, ...candles.map((c) => c.high));
  const pad = (hi - lo) * 0.06;
  return { min: lo - pad, max: hi + pad };
}

export function CandleSvg({
  candles,
  ma,
  slots,
  lines = [],
  maskFrom,
  markAt,
  animateIn,
  revealFrom,
  range,
  width = 640,
  height = 340,
  padRight = 76,
  ariaLabel,
}: CandleSvgProps) {
  const { min, max } = range ?? priceRange(candles, lines.map((l) => l.price));
  const plotW = width - padRight;
  const step = plotW / slots;
  const bodyW = Math.max(2, step * 0.62);
  const PAD_Y = 24;
  const y = (p: number) => PAD_Y + ((max - p) / (max - min)) * (height - PAD_Y * 2);
  const x = (i: number) => i * step + step / 2;
  // 전체 그리기가 약 1초 안에 끝나도록 봉당 지연을 맞춘다
  const perCandle = Math.min(16, 1000 / Math.max(1, candles.length));

  const maPath = (ma ?? [])
    .map((v, i) => (v === undefined ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--hairline)" strokeWidth="3" />
        </pattern>
      </defs>

      {candles.map((c, i) => {
        const color = c.close >= c.open ? "var(--up)" : "var(--down)";
        const top = y(Math.max(c.open, c.close));
        const bottom = y(Math.min(c.open, c.close));
        const revealed = revealFrom !== undefined && i >= revealFrom;
        const delay = animateIn ? i * perCandle : revealed ? (i - revealFrom) * 45 : undefined;
        return (
          <g
            key={i}
            className={animateIn || revealed ? "anim-candle" : undefined}
            style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}
          >
            <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
            <rect x={x(i) - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} fill={color} />
          </g>
        );
      })}

      {maPath && (
        <polyline
          points={maPath}
          pathLength={1}
          className={animateIn ? "anim-draw" : undefined}
          style={animateIn ? { animationDelay: "500ms" } : undefined}
          fill="none"
          stroke="var(--body-text)"
          strokeOpacity={0.45}
          strokeWidth={1.25}
        />
      )}

      {maskFrom !== undefined && (
        <g className={animateIn ? "anim-fade" : undefined} style={animateIn ? { animationDelay: "1300ms" } : undefined}>
          <rect x={maskFrom * step} y={0} width={plotW - maskFrom * step} height={height} fill="url(#hatch)" opacity={0.7} />
          <line
            x1={maskFrom * step}
            x2={maskFrom * step}
            y1={0}
            y2={height}
            stroke="var(--brand)"
            strokeOpacity={0.5}
            strokeDasharray="3 4"
          />
        </g>
      )}

      {markAt !== undefined && (
        <line
          x1={markAt * step}
          x2={markAt * step}
          y1={0}
          y2={height}
          stroke="var(--brand)"
          strokeOpacity={0.5}
          strokeDasharray="3 4"
        />
      )}

      {lines.map((l) => (
        <g key={l.label} className={animateIn ? "anim-fade" : undefined} style={animateIn ? { animationDelay: "900ms" } : undefined}>
          <line x1={0} x2={plotW} y1={y(l.price)} y2={y(l.price)} stroke={TONE[l.tone]} strokeOpacity={0.7} strokeDasharray="4 4" />
          <rect x={plotW + 6} y={y(l.price) - 10} width={padRight - 10} height={20} rx={4} fill={TONE[l.tone]} fillOpacity={0.14} />
          <text x={plotW + 12} y={y(l.price) + 4} fontSize={11} fill={TONE[l.tone]} fontFamily="var(--font-jetbrains-mono)">
            {won(l.price)}
          </text>
        </g>
      ))}
    </svg>
  );
}
