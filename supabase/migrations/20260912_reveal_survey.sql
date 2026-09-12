-- REPS — 결과 화면 한 문항 설문 (사용자 반응 측정)
-- 로그인 사용자가 5회째·20회째 판단(지나간 것 제외) 결과 화면에서 한 번씩만 응답한다.
-- Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.

create table if not exists public.reveal_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone smallint not null check (milestone in (5, 20)),
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),

  -- 같은 사용자가 같은 마일스톤에 두 번 응답할 수 없다
  unique (user_id, milestone)
);

alter table public.reveal_surveys enable row level security;

drop policy if exists "reveal_surveys_select_own" on public.reveal_surveys;
create policy "reveal_surveys_select_own" on public.reveal_surveys
  for select using (auth.uid() = user_id);

drop policy if exists "reveal_surveys_insert_own" on public.reveal_surveys;
create policy "reveal_surveys_insert_own" on public.reveal_surveys
  for insert with check (auth.uid() = user_id);
