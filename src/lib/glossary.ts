export type GlossaryTerm = {
  id: string;
  term: string;
  description: string;
};

export const glossary: Record<string, GlossaryTerm> = {
  "son-jeol": {
    id: "son-jeol",
    term: "손절",
    description:
      "내 예상이 틀렸다고 인정하고 파는 것. 미리 정해둔 가격에 자동으로 팝니다.",
  },
  "r-multiple": {
    id: "r-multiple",
    term: "R",
    description:
      "손절했을 때 잃는 금액을 '1'로 놓고 재는 단위. +2R은 손절폭의 2배를 벌었다는 뜻입니다.",
  },
  "gi-dae-gap": {
    id: "gi-dae-gap",
    term: "기대값",
    description:
      "한 번 거래할 때 평균적으로 몇 R을 버는지. +0.2R이면 100번 하면 평균 20R을 법니다.",
  },
  "seung-ryul": {
    id: "seung-ryul",
    term: "승률",
    description:
      "이긴 횟수의 비율. 중요해 보이지만 함정이 있어서 이 서비스는 크게 안 보여줍니다.",
  },
  "set-up": {
    id: "set-up",
    term: "셋업",
    description:
      "\"이런 모양이 나오면 산다\"는 나만의 규칙. 매번 다르게 사면 실력이 안 늘어서 필요합니다.",
  },
  "jin-ip": {
    id: "jin-ip",
    term: "진입",
    description: "주식을 사는 것.",
  },
  "cheong-san": {
    id: "cheong-san",
    term: "청산",
    description:
      "갖고 있던 주식을 파는 것. 이익이든 손실이든 상관없이 파는 행위 자체를 말합니다.",
  },
  "po-ji-syeon": {
    id: "po-ji-syeon",
    term: "포지션",
    description: "지금 갖고 있는 주식. \"포지션을 잡는다\" = 산다.",
  },
  "pyo-bon": {
    id: "pyo-bon",
    term: "표본",
    description: "지금까지 모은 연습 횟수. 적으면 잘한 건지 운인지 구별이 안 됩니다.",
  },
  "jun-su-yul": {
    id: "jun-su-yul",
    term: "준수율",
    description: "미리 세운 계획을 그대로 지킨 비율. 이게 이 서비스의 1번 성적표입니다.",
  },
  "ho-ga": {
    id: "ho-ga",
    term: "호가",
    description: "사겠다는 가격과 팔겠다는 가격의 목록.",
  },
  "bong-cha-teu": {
    id: "bong-cha-teu",
    term: "봉차트",
    description:
      "일정 시간 동안의 가격 움직임을 막대 하나로 표현한 차트. 빨간색은 오른 날, 파란색은 내린 날입니다.",
  },
  "i-pyeong-seon": {
    id: "i-pyeong-seon",
    term: "이동평균선",
    description: "최근 며칠간 평균 가격을 이은 선. 20일선은 최근 20일 평균입니다.",
  },
  "nul-lim-mok": {
    id: "nul-lim-mok",
    term: "눌림목",
    description:
      "오르던 주식이 잠깐 쉬며 내려온 자리. 여기서 다시 오를 것을 기대하고 삽니다.",
  },
  "dol-pa": {
    id: "dol-pa",
    term: "돌파",
    description: "가격이 그동안 못 넘던 벽을 뚫고 올라가는 것.",
  },
};

export function getGlossaryTerm(id: string): GlossaryTerm | undefined {
  return glossary[id];
}
