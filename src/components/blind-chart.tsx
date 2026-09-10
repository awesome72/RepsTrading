"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/market/generator";
import { smaSeries } from "@/lib/market/indicators";

export type BlindChartHandle = {
  /** 다음 n개 봉을 공개한다. 호출 시점 이전에는 이 데이터를 컴포넌트가 갖고 있지 않다. */
  advance: (nextCandles: Candle[]) => void;
};

type BlindChartProps = {
  /** 지금 시점까지 공개된 봉만 넘긴다. decisionIndex 이후 봉은 절대 포함하지 않는다. */
  candles: Candle[];
  /** 익명 연습 코드, 예: "연습 #A7F2" */
  label: string;
  className?: string;
};

function cssVar(name: string): string {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function toChartCandle(c: Candle) {
  return {
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

export const BlindChart = forwardRef<BlindChartHandle, BlindChartProps>(
  function BlindChart({ candles, label, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const maSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const dataRef = useRef<Candle[]>(candles);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const up = cssVar("--up") || "#F6465D";
      const down = cssVar("--down") || "#3B82F6";
      const surface2 = cssVar("--surface-2") || "#2B3139";
      const bodyText = cssVar("--body-text") || "#EAECEF";
      const muted = cssVar("--muted-text") || "#707A8A";

      const chart = createChart(container, {
        layout: {
          background: { color: surface2 },
          textColor: muted,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        timeScale: { visible: false, borderVisible: false },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.25 },
        },
        crosshair: { mode: 0 },
        autoSize: true,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: up,
        downColor: down,
        borderVisible: false,
        wickUpColor: up,
        wickDownColor: down,
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: muted,
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      const maSeries = chart.addSeries(LineSeries, {
        color: bodyText,
        lineWidth: 1,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      maSeriesRef.current = maSeries;

      return () => {
        chart.remove();
        chartRef.current = null;
      };
    }, []);

    function render(all: Candle[]) {
      const candleSeries = candleSeriesRef.current;
      const volumeSeries = volumeSeriesRef.current;
      const maSeries = maSeriesRef.current;
      if (!candleSeries || !volumeSeries || !maSeries) return;

      candleSeries.setData(all.map(toChartCandle));
      volumeSeries.setData(
        all.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? cssVar("--up") : cssVar("--down"),
        }))
      );
      const ma20 = smaSeries(all, 20);
      maSeries.setData(
        all
          .map((c, i) => ({ time: c.time as UTCTimestamp, value: ma20[i] }))
          .filter((p): p is { time: UTCTimestamp; value: number } => p.value !== undefined)
      );
      chartRef.current?.timeScale().fitContent();
    }

    useEffect(() => {
      dataRef.current = candles;
      render(candles);
    }, [candles]);

    useImperativeHandle(ref, () => ({
      advance(nextCandles: Candle[]) {
        dataRef.current = [...dataRef.current, ...nextCandles];
        render(dataRef.current);
      },
    }));

    return (
      <div className={className}>
        <div className="relative overflow-hidden rounded-lg border border-border">
          <span className="absolute left-3 top-3 z-10 rounded bg-background/70 px-2 py-1 font-mono text-[11px] text-muted-foreground">
            {label}
          </span>
          <div ref={containerRef} className="h-[420px] w-full" />
        </div>
      </div>
    );
  }
);
