-- REPS — AI 코치 조언 요청 사용자별 사용량 제한
-- 짧은 시간에 반복 호출로 Anthropic API 비용이 급증하는 것을 막는다.
-- Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.

create table if not exists public.ai_advice_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_advice_requests_user_created_idx
  on public.ai_advice_requests (user_id, created_at desc);

alter table public.ai_advice_requests enable row level security;

drop policy if exists "ai_advice_requests_select_own" on public.ai_advice_requests;
create policy "ai_advice_requests_select_own" on public.ai_advice_requests
  for select using (auth.uid() = user_id);

drop policy if exists "ai_advice_requests_insert_own" on public.ai_advice_requests;
create policy "ai_advice_requests_insert_own" on public.ai_advice_requests
  for insert with check (auth.uid() = user_id);
