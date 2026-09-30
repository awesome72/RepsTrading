import { Lock } from "lucide-react";
import { DECISION_INDEX, generateScenario } from "@/lib/market/scenario";
import { smaSeries } from "@/lib/market/indicators";
import { CandleSvg } from "./candle-svg";

/**
 * 랜딩 히어로의 제품 목업. 그림이 아니라 실제 시나리오 생성기가 만든 봉을 서버에서 SVG로 그린다
 * (클라이언트 JS 0). 캔들이 왼쪽부터 그려지고 → 계획 카드가 잠기고 → 판단 이후가 빗금으로 덮이는
 * 순서로 한 번만 움직인다(CSS만, "동작 줄이기" 설정이면 정지).
 * 눌림목 시드 중 추세·되돌림이 보기 좋은 것을 골랐다 — 바꾸려면 setupLabelForSeed로 확인할 것.
 */
const SEED = 30;
const VISIBLE = 64;
const HIDDEN_SLOTS = 22;
const W = 640;
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

  const slots = VISIBLE + HIDDEN_SLOTS;
  const plotW = W - PAD_R;
  const maskX = VISIBLE * (plotW / slots);

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

        <CandleSvg
          candles={candles}
          ma={ma}
          slots={slots}
          maskFrom={VISIBLE}
          animateIn
          lines={[
            { price: target, label: "목표", tone: "up" },
            { price: entry, label: "진입", tone: "neutral" },
            { price: stop, label: "손절", tone: "down" },
          ]}
          width={W}
          padRight={PAD_R}
          ariaLabel="판단 시점까지 공개된 차트와 가려진 이후 구간"
        />
      </div>

      {/* 떠 있는 계획 카드 — 사기 전에 적고 잠근다 */}
      <div
        className="anim-rise absolute left-4 top-16 w-48 rounded-xl border border-border bg-background/90 p-3.5 shadow-xl shadow-black/50 backdrop-blur sm:-left-6 sm:top-20 sm:w-52"
        style={{ animationDelay: "700ms" }}
      >
        <div className="mb-2.5 flex items-center justify-between">
          <span className="eyebrow text-muted-foreground">계획</span>
          <span className="anim-lock flex items-center gap-1 text-[11px] font-medium text-primary" style={{ animationDelay: "1100ms" }}>
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
        className="anim-fade absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center sm:flex"
        style={{ left: `${(((maskX + plotW) / 2) / W) * 100}%`, animationDelay: "1500ms" }}
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
