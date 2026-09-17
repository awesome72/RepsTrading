-- reps.setup_label / reps.entry_price — scenario_seed로부터 매번 180봉을 재생성해 뽑아내던
-- 값(정답 셋업, 진입가)을 커밋 시점에 한 번 계산해 캐시한다. 목록·요약 API가 rep 하나당
-- generateScenario를 다시 부르지 않게 하기 위함(순수 성능 캐시 — 판정/채점의 근거는 여전히
-- scenario_seed로부터의 재생성이며 이 값들로 대체하지 않는다).
-- 기존 행은 두 컬럼이 NULL로 남는다 — serverRepToRep이 NULL이면 그때는 예전처럼 재생성한다.

alter table public.reps
  add column if not exists setup_label text check (setup_label in ('pullback', 'breakout', 'none')),
  add column if not exists entry_price numeric;
