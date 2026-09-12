# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

REPS is a Korean-language trading *practice* web app: users judge synthetic candlestick charts, write a plan (setup / stop / target) before buying, watch it replay, grade their own judgment, and only then see the result in R units. Stage gates (G1 실행 → G2 판별 → G3 전환) decide when someone is "ready". The original product spec and principles live in `REPS_바이브코딩_프롬프트팩.md` (MASTER section). Some rules have since changed in code — the code is authoritative (see "Spec doc" below).

Stack: Next.js 15.5 App Router + React 19 + TypeScript (strict), Tailwind v4 + shadcn/ui, zustand, lightweight-charts, recharts, Supabase (auth + Postgres), Vitest. Deployed on Vercel; pushing to `main` auto-deploys production. `.github/workflows/ci.yml` runs lint + `tsc` + vitest + build on every push/PR to `main` — **Vercel's own build does not run the test suite**, so this workflow is the only thing that does.

`AGENTS.md` tells agents to read `node_modules/next/dist/docs/` first — that directory does not exist in this install. Ignore that instruction; this is a standard Next.js 15 App Router project.

## Commands

```bash
npm run dev                                   # dev server on :3000
npm run build                                 # production build (also type-checks + lints)
npm run lint                                  # eslint
npx tsc --noEmit                              # type-check only
npm test                                      # vitest run (all)
npx vitest run src/lib/gate/rules.test.ts     # one file
npx vitest run -t "decideGateTransition"      # by test name
```

- If you ran `npm run build`, delete `.next/` before `npm run dev`, otherwise dev throws ENOENT errors from the shared build dir.
- Env (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` is not used by the app — only by ad-hoc admin/test scripts. `ANTHROPIC_API_KEY` powers the AI advice feature (server-only; also set it in the Vercel project's env vars for production) — without it, `/api/reps/[id]/advice` degrades to a 500 with a Korean error message instead of crashing.
- DB schema: `supabase/migrations/*.sql`. There is no migration runner; SQL is applied by hand in the Supabase SQL editor, so prefer changes that don't need DDL.
- Login is email magic-link only (no passwords).

## Architecture

### Seed-determinism is the core invariant
`generateScenario(seed)` (`src/lib/market/scenario.ts`, built on `generator.ts` + `rng.ts`/seedrandom) deterministically produces the whole 180-candle chart and the hidden answer (`setupLabel`). The DB stores only `scenario_seed` + the plan; the server regenerates candles, entry price, and target from the seed to validate exits and compute R (`rebuildPlan` / `deriveEntryPrice` / `validateExit` in `src/lib/rep/server-guard.ts`). **Any change to the generator, scenario construction, or RNG consumption order changes every stored rep's recomputed entry/R** — treat it as a data migration. To bias which setups appear, pick seeds (`pickSeedForMix` / `setupLabelForSeed`), never alter generation.

### Rep lifecycle and the result lock
`src/lib/rep/machine.ts` is a strict state machine: `WATCHING → COMMITTED → EXECUTED → GRADED → REVEALED` (out-of-order transitions throw). `rep.result` must stay `undefined` before GRADED — the lock is on the data, not just the UI. The server enforces the same order:

- `POST /api/reps` commit (plan becomes immutable — DB trigger rejects `plan_*` updates and backward state moves)
- `POST /api/reps/[id]/execute` → `validateExit` + `judgeExecution` (server derives `adhered`; the client's claim is ignored)
- `POST /api/reps/[id]/grade` → rejects a grade better than the execution allows (`isGradeAllowed`), computes `r_result`
- `POST /api/reps/[id]/reveal`; `GET /api/reps` and `/api/reps/[id]` strip `exit_price` / `r_result` before GRADED
- `POST /api/reps/pass` stores a "지나간다" in one step (placeholder plan: setup `other`, stop = entry, 0R — same convention as `machine.passRep`)

### Grading and adherence (shared client/server logic)
`src/lib/rep/plan-outcome.ts` holds rules used by both the replay UI and the API: `checkPlanExit` (stop wins if a candle hits both), `simulatePlan` (what the untouched plan would have done), `judgeExecution` (followed → best A, manual early exit → C, stop lowered/ignored → D), `isGradeAllowed` (users may grade themselves worse than the facts, never better). A vs B comes only from the two judgment questions in `grade-options.ts`. Keep client and server on these same functions.

### Where data lives (client)
- `useRepStore` (`lib/rep/store.ts`): the single in-progress rep. Mid-replay state is mirrored to `sessionStorage` so a refresh can resume.
- `useRepLogStore` (`lib/rep/log-store.ts`): every screen's rep history. `mode: "server"` = mirror of `GET /api/reps`; `mode: "guest"` = localStorage (`reps.guest.v1`), capped at `GUEST_REP_LIMIT` (5).
- `useAccountStore` (`lib/account/store.ts`): onboarding settings (localStorage cache until login, then synced with `/api/account`); `gateLevel` comes only from the server.
- `components/auth/session-sync.tsx` (mounted in the root layout) owns the login/logout lifecycle: on login it uploads legacy/guest local reps via `/api/migrate` (which re-derives R/adherence/grade server-side in `lib/rep/migration.ts`), then refreshes the log and syncs the account; on logout it resets the stores.

### Gates, metrics, feedback
- Gate rules: `lib/gate/rules.ts` (`GATE_TARGETS`, `evaluateGate`, `decideGateTransition`, `checkDemotion`). Promotion/demotion is decided server-side in `POST /api/account/gate` after each rep. Gate numbers are product decisions — don't change them without the owner's approval.
- Stats: `lib/metrics/stats.ts`. `tradedReps` excludes passes and guided (onboarding) reps and drives counts/expectancy/adherence; `setupAccuracy` also counts passes (passing a no-setup chart is correct, buying as "기타" never is).
- Immediate feedback: `lib/feedback/rules.ts` is a priority-ordered rule list; the first matching rule wins. Deliberately rule-based — no LLM calls (this is a spec principle; keep it that way).
- Daily goal / weekly comparison / pace ETA: `lib/metrics/progress.ts`.
- AI coach advice (`lib/ai/advisor.ts`, `POST /api/reps/[id]/advice`, `components/rep/ai-advice.tsx`): a separate, opt-in feature — the user clicks a button on the reveal screen to get a short Claude-generated coaching note. Distinct from the rule-based immediate feedback above, which stays untouched. Only available to logged-in users (guests have no server-side rep row to fetch); requires `rep.state` to be `GRADED`/`REVEALED`, same result-lock boundary as everywhere else. The server rebuilds facts from the DB row + `rebuildPlan`, never trusts client-supplied results.
- User-reaction measurement: a one-question reveal-screen survey (`components/rep/reveal-survey.tsx`, `POST /api/feedback`, `reveal_surveys` table) fires exactly once at the 5th and 20th traded rep (logged-in users only; the server re-counts `reps` to verify the milestone rather than trusting the client). Onboarding→first-grade completion, reps-per-session, and D1/D7 return don't have app code — they're computed on demand from existing tables via `supabase/analytics-queries.sql`.

## Conventions

- Calculation logic goes in `src/lib/` as pure functions with a colocated `*.test.ts` (tests cover `lib/` only); components stay thin. The app pages (practice, journal, progress, onboarding, login) are client components that talk to the API routes; only the landing and tutorial pages render on the server.
- All user-facing text is Korean. Wrap jargon in `<Term id="...">` (definitions in `src/lib/glossary.ts`).
- Performance is shown in R, never in won P&L; no leaderboards, badges, points, or streaks (spec principle). Showing 1R / position size in won when planning is fine.
- Colors come from CSS variables in `src/app/globals.css` (dark theme with yellow `--brand`, derived from `DESIGN-binance.md`). Korean market convention: `--up` = red, `--down` = blue — never the US green/red mapping. Numbers use the `num` class (mono, tabular).
- Keyboard-first practice flow via `useHotkeys` (`lib/hooks/use-hotkeys.ts`), which also matches physical keys so shortcuts work with the Korean IME on.

## Spec doc
`REPS_바이브코딩_프롬프트팩.md` documents the original 7-stage build plan (Stages 1–7, in imperative prompt form) plus a factual "출시 이후 추가된 기능" section covering everything shipped after Stage 7 (guest mode, settings page, AI advice, server-side gate evaluation, etc.) — kept in sync with the code as of 2026-09-12. Still ask the owner before editing the spec doc further.
