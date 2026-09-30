"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Captions,
  CaptionsOff,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { useAccountStore } from "@/lib/account/store";
import { useCompactViewport } from "@/lib/hooks/use-compact-viewport";
import { TUTORIAL_SCENES } from "@/lib/tutorial/scenes";
import {
  PLAYBACK_SPEEDS,
  clearTutorialProgress,
  estimateSceneMs,
  loadTutorialProgress,
  saveTutorialProgress,
  type PlaybackSpeed,
} from "@/lib/tutorial/playback";
import { cn } from "@/lib/utils";

const SCENES = TUTORIAL_SCENES;
const LAST = SCENES.length - 1;
/** 한국어 음성 합성의 기본 속도 — 재생 속도 선택(0.9/1/1.2)을 여기에 곱한다 */
const BASE_RATE = 0.98;

function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("ko")) ??
    voices.find((v) => v.name.toLowerCase().includes("korean"))
  );
}

/**
 * 사용법 소개 영상. 실제 화면 캡처 + 음성(브라우저 음성 합성) + 자막.
 * 음성이 없거나 꺼져 있으면 자막 길이로 추정한 시간만큼 머문 뒤 넘어간다.
 * 일시정지 후 다시 재생하면 그 장면을 처음부터 다시 읽는다 — 브라우저의 음성 합성은
 * 중간 재개(pause/resume)가 불안정해서, 장면 단위로 끊는 쪽이 예측 가능하다.
 */
export function TutorialPlayer() {
  const router = useRouter();
  const onboarded = useAccountStore((s) => s.onboardingCompleted);
  // 폰에서는 1440px 화면 캡처 전체가 너무 작아 안 읽힌다 — 설명하는 지점을 처음부터 크게 잘라 보여준다
  const compact = useCompactViewport();

  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ccOn, setCcOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [chaptersOpen, setChaptersOpen] = useState(false);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // 저장된 위치·음성 지원 여부는 브라우저에서만 알 수 있다 — 마운트 직후 한 번 반영한다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResumeIndex(loadTutorialProgress(SCENES.length));
    useAccountStore.getState().hydrate();
    if (!("speechSynthesis" in window)) {
      setSpeechSupported(false);
      return;
    }
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const advance = useCallback(() => {
    setIndex((i) => {
      if (i >= LAST) {
        setPlaying(false);
        setProgress(1);
        return i;
      }
      return i + 1;
    });
  }, []);

  // 장면 재생: 음성(또는 추정 시간) + 진행 막대. index·재생 상태·음성·속도가 바뀌면 그 장면을 새로 시작한다
  useEffect(() => {
    if (!playing) return;
    const scene = SCENES[index];
    const ms = estimateSceneMs(scene.caption, speed);
    const useVoice = speechSupported && !muted;
    const start = performance.now();
    let raf = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      advance();
    };
    const tick = () => {
      setProgress(Math.min(1, (performance.now() - start) / ms));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 음성이 끝났다는 신호가 안 오는 브라우저도 있어서, 추정 시간의 두 배가 지나면 넘어간다
    const timer = setTimeout(finish, useVoice ? ms * 2 : ms);
    if (useVoice) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(scene.caption);
      utter.lang = "ko-KR";
      const voice = pickKoreanVoice(voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices());
      if (voice) utter.voice = voice;
      utter.rate = BASE_RATE * speed;
      utter.onend = finish;
      utter.onerror = finish;
      window.speechSynthesis.speak(utter);
    }
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      if (useVoice) window.speechSynthesis.cancel();
    };
  }, [index, playing, muted, speed, speechSupported, advance]);

  // 보던 위치 기억 — 끝까지 보면 지운다
  useEffect(() => {
    if (!started) return;
    if (index >= LAST) clearTutorialProgress();
    else saveTutorialProgress(index);
  }, [index, started]);

  function begin(from: number) {
    setIndex(from);
    setProgress(0);
    setStarted(true);
    setPlaying(true);
  }

  function goTo(i: number) {
    const next = Math.max(0, Math.min(LAST, i));
    setIndex(next);
    setProgress(0);
    setStarted(true);
    setChaptersOpen(false);
  }

  function togglePlay() {
    if (!started) return begin(0);
    if (index === LAST && !playing && progress >= 1) return begin(0);
    setPlaying((p) => !p);
  }

  function close() {
    // 사이트 안에서 들어왔으면 원래 화면으로, 링크로 바로 왔으면 홈으로
    const cameFromHere = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (cameFromHere && window.history.length > 1) router.back();
    else router.push("/");
  }

  useHotkeys({
    " ": togglePlay,
    ArrowRight: () => goTo(index + 1),
    ArrowLeft: () => goTo(index - 1),
    Escape: () => (chaptersOpen ? setChaptersOpen(false) : close()),
    c: () => setCcOn((v) => !v),
    m: () => setMuted((v) => !v),
  });

  const scene = SCENES[index];
  const sceneMs = estimateSceneMs(scene.caption, speed);
  const kbFrom = compact ? 1.9 : 1;
  const kbTo = compact ? 2.05 : (scene.focus?.zoom ?? 1.12);
  const ended = index === LAST && progress >= 1 && !playing;

  const chapterList = (
    <ol className="flex flex-col gap-0.5">
      {SCENES.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => goTo(i)}
            aria-current={i === index ? "step" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
              i === index ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
            )}
          >
            <span className={cn("num w-5 shrink-0 text-[11px]", i === index ? "text-primary" : "text-muted-foreground/70")}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate">{s.title}</span>
            <span className="num shrink-0 text-[11px] text-muted-foreground/60">
              {Math.round(estimateSceneMs(s.caption, speed) / 1000)}초
            </span>
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_-10%,color-mix(in_oklab,var(--brand)_7%,transparent),transparent_70%)]"
      />

      {/* 상단 바 */}
      <header className="relative flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[13px] font-bold text-primary-foreground">
            R
          </span>
          <span className="shrink-0 text-[13px] font-semibold text-foreground">사용법</span>
          <span className="hidden min-w-0 truncate text-[13px] text-muted-foreground sm:inline">· {scene.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={ccOn ? "자막 끄기 (C)" : "자막 켜기 (C)"} pressed={ccOn} onClick={() => setCcOn((v) => !v)}>
            {ccOn ? <Captions className="size-4" /> : <CaptionsOff className="size-4" />}
          </IconButton>
          {speechSupported && (
            <IconButton label={muted ? "음성 켜기 (M)" : "음성 끄기 (M)"} pressed={!muted} onClick={() => setMuted((v) => !v)}>
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </IconButton>
          )}
          <div className="mx-1 hidden items-center rounded-lg border border-border p-0.5 sm:flex" role="group" aria-label="재생 속도">
            {PLAYBACK_SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "num h-6 rounded-md px-2 text-[11px] font-medium transition-colors",
                  speed === s ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}×
              </button>
            ))}
          </div>
          <IconButton label="목차" pressed={chaptersOpen} onClick={() => setChaptersOpen((v) => !v)} className="lg:hidden">
            <ListOrdered className="size-4" />
          </IconButton>
          <IconButton label="닫기 (Esc)" onClick={close}>
            <X className="size-4" />
          </IconButton>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* 무대 */}
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="relative w-full max-w-4xl">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl sm:aspect-[16/10] border border-border bg-card shadow-2xl shadow-black/60">
              {scene.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- 정적 튜토리얼 스크린샷, 최적화 불필요
                <img
                  key={`${scene.id}-${playing}`}
                  src={scene.image}
                  alt={scene.title}
                  className={cn("anim-fade size-full object-cover object-top", playing && "anim-kenburns")}
                  style={
                    {
                      transformOrigin: `${scene.focus?.x ?? 50}% ${scene.focus?.y ?? 50}%`,
                      // 멈춰 있을 때도 모바일은 확대된 상태를 유지한다
                      transform: playing ? undefined : `scale(${kbFrom})`,
                      "--kb-from": kbFrom,
                      "--kb-zoom": kbTo,
                      "--kb-ms": `${sceneMs}ms`,
                    } as React.CSSProperties
                  }
                />
              ) : (
                <TitleCard key={scene.id} scene={scene} isOutro={index === LAST} onboarded={onboarded} onReplay={() => begin(0)} />
              )}

              {/* 시작 전: 영상처럼 큰 재생 버튼 */}
              {!started && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/70 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => begin(0)}
                    aria-label="처음부터 재생"
                    className="group flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-black/60 transition-transform hover:scale-105"
                  >
                    <Play className="ml-1 size-8 fill-current" />
                  </button>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-[18px] font-semibold text-foreground">2분 사용법</p>
                    <p className="text-[13px] text-muted-foreground">
                      {speechSupported ? "소리를 켜면 음성으로 안내합니다 · 자막 지원" : "자막으로 안내합니다"}
                    </p>
                  </div>
                  {resumeIndex !== null && (
                    <button
                      type="button"
                      onClick={() => begin(resumeIndex)}
                      className="rounded-full border border-border bg-background/80 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-primary"
                    >
                      이어서 보기 · {String(resumeIndex + 1).padStart(2, "0")} {SCENES[resumeIndex].title}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 자막 — 화면을 가리지 않게 프레임 아래에 둔다 */}
          <div className="flex min-h-[4.5rem] w-full max-w-3xl items-start justify-center">
            {ccOn && started && (
              <p key={scene.id} className="anim-fade text-center text-[15px] leading-relaxed text-foreground/90 sm:text-[16px]">
                {scene.caption}
              </p>
            )}
          </div>
        </main>

        {/* 목차 — 데스크톱은 옆에 고정, 모바일은 위에 겹쳐 연다 */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-3 lg:block">
          <p className="eyebrow px-3 pb-2 pt-1 text-muted-foreground">목차</p>
          {chapterList}
        </aside>
        {chaptersOpen && (
          <div className="absolute inset-0 z-10 flex flex-col bg-background/95 p-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <p className="eyebrow text-muted-foreground">목차</p>
              <div className="flex items-center rounded-lg border border-border p-0.5 sm:hidden" role="group" aria-label="재생 속도">
                {PLAYBACK_SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={speed === s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "num h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors",
                      speed === s ? "bg-surface-2 text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{chapterList}</div>
          </div>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <footer className="relative flex shrink-0 flex-col gap-3 border-t border-border px-4 pb-4 pt-3">
        {/* 장면별 진행 — 지난 장면은 가득, 지금 장면은 흐르는 만큼 */}
        <div className="mx-auto flex w-full max-w-4xl gap-1" role="group" aria-label="장면 이동">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}. ${s.title}`}
              className="group relative h-4 flex-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
            >
              <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-surface-2 transition-all group-hover:h-1.5">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
                />
              </span>
            </button>
          ))}
        </div>
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <span className="num w-16 text-[12px] text-muted-foreground">
            {index + 1} / {SCENES.length}
          </span>
          <div className="flex items-center gap-2">
            <IconButton label="이전 장면 (←)" onClick={() => goTo(index - 1)} disabled={index === 0} size="lg">
              <ChevronLeft className="size-5" />
            </IconButton>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={ended ? "처음부터 다시" : playing ? "일시정지 (Space)" : "재생 (Space)"}
              className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
            >
              {ended ? (
                <RotateCcw className="size-5" />
              ) : playing ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="ml-0.5 size-5 fill-current" />
              )}
            </button>
            <IconButton label="다음 장면 (→)" onClick={() => goTo(index + 1)} disabled={index === LAST} size="lg">
              <ChevronRight className="size-5" />
            </IconButton>
          </div>
          <span className="hidden w-16 text-right text-[11px] text-muted-foreground/70 sm:block">Space · ← →</span>
          <span className="w-16 sm:hidden" />
        </div>
        {!speechSupported && (
          <p className="text-center text-[11px] text-muted-foreground">
            이 브라우저는 음성 안내를 지원하지 않아 자막만으로 진행합니다.
          </p>
        )}
      </footer>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  pressed,
  disabled,
  size = "md",
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        size === "lg" ? "size-10" : "size-8",
        pressed && "text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

/** 이미지가 없는 첫·마지막 장면 — 마지막 장면은 바로 다음 행동으로 이어준다 */
function TitleCard({
  scene,
  isOutro,
  onboarded,
  onReplay,
}: {
  scene: (typeof SCENES)[number];
  isOutro: boolean;
  onboarded: boolean;
  onReplay: () => void;
}) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-5 bg-[radial-gradient(60%_70%_at_50%_30%,color-mix(in_oklab,var(--brand)_10%,transparent),transparent)] px-6 text-center">
      <span className="anim-rise flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary font-mono text-[20px] font-bold text-primary-foreground">
          R
        </span>
        <span className="text-[22px] font-bold tracking-[0.14em] text-foreground">REPS</span>
      </span>
      <h2
        className="anim-rise max-w-lg text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[34px]"
        style={{ animationDelay: "120ms" }}
      >
        {scene.title}
      </h2>
      {isOutro && (
        <div className="anim-rise flex flex-wrap items-center justify-center gap-2 pt-2" style={{ animationDelay: "240ms" }}>
          <Link
            href={onboarded ? "/practice" : "/onboarding"}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-6 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {onboarded ? "연습하러 가기" : "첫 연습 시작"} <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/#try"
            className="inline-flex h-11 items-center rounded-full border border-border px-5 text-[14px] font-medium text-foreground transition-colors hover:border-primary"
          >
            30초 체험
          </Link>
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> 처음부터
          </button>
        </div>
      )}
    </div>
  );
}
