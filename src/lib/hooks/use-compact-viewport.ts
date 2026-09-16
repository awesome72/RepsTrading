import { useEffect, useState } from "react";

/** Tailwind의 `md` 기준(768px)과 맞춘 모바일 판정 — 좁은 화면에서 차트를 줄이는 등에 쓴다 */
const QUERY = "(max-width: 767px)";

export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return compact;
}
