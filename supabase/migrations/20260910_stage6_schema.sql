-- REPS STAGE 6 — 서버 결과 잠금 스키마
-- Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.

-- =========================================================
-- 1) users — 계좌/온보딩 설정 (auth.users를 1:1 확장)
-- =========================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  account_size numeric not null default 10000000,
  risk_percent numeric not null default 1,
  setup_preference text not null default 'pullback'
    check (setup_preference in ('pullback', 'breakout', 'both')),
  onboarding_completed boolean not null default false,
  gate_level smallint not null default 1 check (gate_level in (1, 2, 3)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2) setups — 셋업 종류 lookup
-- =========================================================
create table if not exists public.setups (
  id text primary key,
  label text not null
);

insert into public.setups (id, label) values
  ('pullback', '눌림목'),
  ('breakout', '돌파'),
  ('other', '기타')
on conflict (id) do nothing;

-- =========================================================
-- 3) reps — 연습 기록 (핵심: 결과 잠금)
--    WATCHING 상태는 서버에 저장하지 않는다. 계획을 저장한 순간(COMMITTED)부터
--    행이 생성된다. entry_price/target_price/미래 캔들은 저장하지 않고
--    scenario_seed로부터 그때그때 결정적으로 재생성한다 (lib/market/scenario.ts).
-- =========================================================
create table if not exists public.reps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  setup_id text not null references public.setups(id),
  scenario_seed bigint not null,

  state text not null check (state in ('COMMITTED', 'EXECUTED', 'GRADED', 'REVEALED')),

  committed_at timestamptz not null,
  commit_hash text not null,

  -- 저장 후 절대 수정 불가 (아래 트리거로 강제)
  plan_setup text not null references public.setups(id),
  plan_stop numeric not null,
  plan_target_r numeric not null,

  exit_price numeric,
  exit_reason text check (exit_reason in ('stop', 'target', 'manual', 'timeout', 'pass')),
  exit_index integer,
  adhered boolean,

  decision_grade text check (decision_grade in ('A', 'B', 'C', 'D')),
  -- GRADED 이전에는 반드시 NULL — /api/reps/[id]에서 이 컬럼을 응답에서 지운다
  r_result numeric,

  input_seconds numeric,
  created_at timestamptz not null default now(),

  -- 마이그레이션 재시도가 중복 행을 만들지 않도록 (upsert onConflict 대상)
  unique (user_id, scenario_seed, committed_at)
);

create index if not exists reps_user_id_idx on public.reps (user_id);

-- =========================================================
-- 4) gate_progress — 승급/강등 이력
-- =========================================================
create table if not exists public.gate_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gate_level smallint not null default 1 check (gate_level in (1, 2, 3)),
  last_promoted_at timestamptz,
  last_demoted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- RLS — 자기 데이터만 읽고 쓴다
-- =========================================================
alter table public.users enable row level security;
alter table public.setups enable row level security;
alter table public.reps enable row level security;
alter table public.gate_progress enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users for select using (auth.uid() = id);
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update using (auth.uid() = id);

drop policy if exists "setups_select_all" on public.setups;
create policy "setups_select_all" on public.setups for select using (true);

drop policy if exists "reps_select_own" on public.reps;
create policy "reps_select_own" on public.reps for select using (auth.uid() = user_id);
drop policy if exists "reps_insert_own" on public.reps;
create policy "reps_insert_own" on public.reps for insert with check (auth.uid() = user_id);
drop policy if exists "reps_update_own" on public.reps;
create policy "reps_update_own" on public.reps for update using (auth.uid() = user_id);

drop policy if exists "gate_select_own" on public.gate_progress;
create policy "gate_select_own" on public.gate_progress for select using (auth.uid() = user_id);
drop policy if exists "gate_insert_own" on public.gate_progress;
create policy "gate_insert_own" on public.gate_progress for insert with check (auth.uid() = user_id);
drop policy if exists "gate_update_own" on public.gate_progress;
create policy "gate_update_own" on public.gate_progress for update using (auth.uid() = user_id);

-- =========================================================
-- 트리거 — plan_* 불변 + 상태는 앞으로만 진행
-- (핵심: "보내놓고 프론트에서 숨기는" 방식이 아니라, DB 자체가 거부한다)
-- =========================================================
create or replace function public.reps_guard_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_arr text[] := array['COMMITTED', 'EXECUTED', 'GRADED', 'REVEALED'];
begin
  if new.plan_setup is distinct from old.plan_setup
     or new.plan_stop is distinct from old.plan_stop
     or new.plan_target_r is distinct from old.plan_target_r
     or new.scenario_seed is distinct from old.scenario_seed
     or new.committed_at is distinct from old.committed_at
     or new.commit_hash is distinct from old.commit_hash
  then
    raise exception 'plan_* 필드는 저장 후 수정할 수 없습니다 (rep %는 이미 COMMITTED 상태입니다)', old.id;
  end if;

  if new.state is distinct from old.state then
    if array_position(order_arr, new.state) <= array_position(order_arr, old.state) then
      raise exception '상태는 뒤로 갈 수 없습니다: % -> %', old.state, new.state;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reps_guard_mutation_trg on public.reps;
create trigger reps_guard_mutation_trg
  before update on public.reps
  for each row execute function public.reps_guard_mutation();
