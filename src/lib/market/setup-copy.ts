import type { SetupLabel } from "./scenario";

/** 정답 셋업이 왜 그 셋업인지 한 줄 설명 — 결과 화면과 판별 퀴즈가 같은 문구를 쓴다 */
export const SETUP_HINT: Record<SetupLabel, string> = {
  pullback: "오르던 주식이 몇 봉 쉬면서 20일선 근처까지 내려온 자리입니다.",
  breakout: "15봉 넘게 좁게 오르내리다가 그 윗부분을 뚫고 올라선 봉입니다.",
  none: "뚜렷한 추세도, 좁은 횡보 뒤의 돌파도 아닌 애매한 자리입니다. 이런 곳은 지나가는 것이 정답입니다.",
};

export const SETUP_NAME: Record<SetupLabel, string> = {
  pullback: "눌림목",
  breakout: "돌파",
  none: "셋업 없음",
};
