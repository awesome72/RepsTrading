"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { TUTORIAL_SCENES } from "@/lib/tutorial/scenes";
import { cn } from "@/lib/utils";

const FALLBACK_SCENE_MS = 6000;

function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("ko")) ??
    voices.find((v) => v.name.toLowerCase().includes("korean"))
  );
}

export function TutorialPlayer() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ccOn, setCcOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(playing);
  const indexRef = useRef(index);
  const mutedRef = useRef(muted);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // 마운트 직후 브라우저 지원 여부를 한 번만 반영한다
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpeechSupported(false);
      return;
    }
    function loadVoices() {
      voicesRef.current = window.speechSynthesis.getVoices();
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    const next = indexRef.current + 1;
    if (next >= TUTORIAL_SCENES.length) {
      setPlaying(false);
      return;
    }
    setIndex(next);
  }, []);

  const playScene = useCallback(
    (i: number) => {
      clearTimer();
      const scene = TUTORIAL_SCENES[i];

      if (mutedRef.current || !speechSupported) {
        // 음성 없이도 자막만으로 진행할 수 있도록 고정 시간 후 다음 장면으로 넘어간다
        timerRef.current = setTimeout(() => {
          if (playingRef.current) advance();
        }, FALLBACK_SCENE_MS);
        return;
      }

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(scene.caption);
      utter.lang = "ko-KR";
      const voice = pickKoreanVoice(
        voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices()
      );
      if (voice) utter.voice = voice;
      utter.rate = 0.98;
      utter.onend = () => {
        if (playingRef.current) advance();
      };
      utter.onerror = () => {
        if (playingRef.current) advance();
      };
      window.speechSynthesis.speak(utter);
    },
    [advance, clearTimer, speechSupported]
  );

  useEffect(() => {
    if (playing) {
      playScene(index);
    } else {
      if (speechSupported) window.speechSynthesis.cancel();
      clearTimer();
    }
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
      clearTimer();
    };
    // index/playing 변화에만 반응한다 — playScene 자체는 위 값들을 ref로 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing]);

  function togglePlay() {
    setPlaying((p) => !p);
  }

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(TUTORIAL_SCENES.length - 1, i)));
  }

  function goNext() {
    goTo(index + 1);
  }
  function goPrev() {
    goTo(index - 1);
  }
  function close() {
    router.push("/");
  }

  useHotkeys({
    " ": togglePlay,
    ArrowRight: goNext,
    ArrowLeft: goPrev,
    Escape: close,
  });

  const scene = TUTORIAL_SCENES[index];
  const isLast = index === TUTORIAL_SCENES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-background/95 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="num">
            {index + 1} / {TUTORIAL_SCENES.length}
          </span>
          <span className="hidden text-foreground sm:inline">{scene.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCcOn((v) => !v)}
            aria-pressed={ccOn}
            className={cn(
              "h-7 rounded border px-2 text-[11px] font-semibold",
              ccOn ? "border-primary text-primary" : "border-border text-muted-foreground"
            )}
          >
            CC
          </button>
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            aria-pressed={muted}
            className="h-7 rounded border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {muted ? "음성 꺼짐" : "음성 켜짐"}
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="튜토리얼 닫기"
            className="h-7 rounded border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            닫기 ✕
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {scene.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- 정적 튜토리얼 스크린샷, 최적화 불필요
          <img
            src={scene.image}
            alt={scene.title}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex max-w-xl flex-col items-center gap-3 px-6 text-center">
            <span className="font-mono text-[28px] font-bold text-primary">REPS</span>
            <h2 className="text-[22px] font-bold text-white">{scene.title}</h2>
          </div>
        )}

        {ccOn && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-8 pt-10">
            <p className="mx-auto max-w-2xl text-center text-[15px] leading-relaxed text-white">
              {scene.caption}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 bg-background px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          {TUTORIAL_SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}. ${s.title}`}
              className={cn(
                "h-1.5 max-w-10 flex-1 rounded-full transition-colors",
                i === index ? "bg-primary" : i < index ? "bg-muted-foreground/50" : "bg-surface-2"
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" className="h-10 px-4" onClick={goPrev} disabled={index === 0}>
            이전
          </Button>
          <Button
            className="h-11 w-32 text-[14px] font-bold"
            onClick={isLast && !playing ? () => goTo(0) : togglePlay}
          >
            {isLast && !playing ? "처음부터" : playing ? "일시정지" : "재생"}
          </Button>
          <Button variant="outline" className="h-10 px-4" onClick={goNext} disabled={isLast}>
            다음
          </Button>
        </div>
        {!speechSupported && (
          <p className="text-center text-[11px] text-muted-foreground">
            이 브라우저는 음성 안내를 지원하지 않아 자막만으로 진행합니다.
          </p>
        )}
      </div>
    </div>
  );
}
