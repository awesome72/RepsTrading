"use client";

import { useEffect, useRef } from "react";

type HotkeyMap = Record<string, () => void>;

/**
 * 전역 키보드 단축키. 텍스트 입력 중에는 (숫자 등) 단축키를 무시해서
 * 손절가 입력 같은 실제 타이핑을 방해하지 않는다. Enter/Escape는 입력 중에도 허용한다.
 */
export function useHotkeys(map: HotkeyMap, allowInInput: string[] = ["Enter", "Escape"]) {
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isTyping && !allowInInput.includes(e.key)) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      // 한글 입력 상태에서는 e.key가 "ㅛ" 같은 자모로 오므로 물리 키(e.code)로도 찾는다
      const physical = e.code.startsWith("Key")
        ? e.code.slice(3).toLowerCase()
        : e.code.startsWith("Digit")
          ? e.code.slice(5)
          : undefined;
      const fn = mapRef.current[key] ?? (physical ? mapRef.current[physical] : undefined);
      if (fn) {
        e.preventDefault();
        fn();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
