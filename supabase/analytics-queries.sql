-- REPS — 사용자 반응 측정용 참고 쿼리
-- 대시보드가 아니라, Supabase SQL Editor에서 그때그때 붙여넣어 확인하는 용도입니다.
-- 온보딩 완료(users.onboarding_completed)·연습 기록(reps)·가입 시각(auth.users)만으로 계산합니다.

-- =========================================================
-- 1) 온보딩 완료 → 첫 채점 완료율
--    "지나간다"는 계획을 세울 게 없어 제외한다(reps 전체 통계의 tradedReps 기준과 동일).
-- =========================================================
with onboarded as (
  select id from public.users where onboarding_completed = true
),
first_graded as (
  select user_id, min(committed_at) as first_graded_at
  from public.reps
  where state in ('GRADED', 'REVEALED') and exit_reason <> 'pass'
  group by user_id
)
select
  count(*) as onboarded_count,
  count(fg.user_id) as reached_first_grade,
  round(100.0 * count(fg.user_id) / nullif(count(*), 0), 1) as completion_pct
from onboarded o
left join first_graded fg on fg.user_id = o.id;

-- =========================================================
-- 2) 세션당 평균 연습 횟수
--    같은 사용자가 30분 이내로 이어서 한 판단들을 한 세션으로 묶는다.
-- =========================================================
with ordered as (
  select
    user_id,
    committed_at,
    committed_at - lag(committed_at) over (partition by user_id order by committed_at) as gap
  from public.reps
  where exit_reason <> 'pass'
),
sessioned as (
  select
    user_id,
    committed_at,
    sum(case when gap is null or gap > interval '30 minutes' then 1 else 0 end)
      over (partition by user_id order by committed_at) as session_no
  from ordered
)
select round(avg(reps_in_session), 1) as avg_reps_per_session
from (
  select user_id, session_no, count(*) as reps_in_session
  from sessioned
  group by user_id, session_no
) s;

-- =========================================================
-- 3) D1 / D7 재방문율
--    가입 다음날 · 7일 뒤에도 연습 기록(지나간 것 포함)이 있는 사용자 비율.
-- =========================================================
with signup as (
  select id, created_at::date as signup_date from auth.users
),
activity as (
  select distinct user_id, committed_at::date as activity_date from public.reps
)
select
  count(distinct s.id) as total_users,
  count(distinct case when a.activity_date = s.signup_date + 1 then s.id end) as d1_returned,
  count(distinct case when a.activity_date = s.signup_date + 7 then s.id end) as d7_returned,
  round(100.0 * count(distinct case when a.activity_date = s.signup_date + 1 then s.id end)
        / nullif(count(distinct s.id), 0), 1) as d1_pct,
  round(100.0 * count(distinct case when a.activity_date = s.signup_date + 7 then s.id end)
        / nullif(count(distinct s.id), 0), 1) as d7_pct
from signup s
left join activity a on a.user_id = s.id;

-- =========================================================
-- 4) 결과 화면 한 문항 설문 응답 분포 (reveal_surveys, 20260912_reveal_survey.sql)
-- =========================================================
select milestone, rating, count(*) as n
from public.reveal_surveys
group by milestone, rating
order by milestone, rating;
