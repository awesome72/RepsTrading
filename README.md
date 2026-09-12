# REPS

REPS는 실제 돈 없이 매매 "판단력"을 훈련하는 한국어 트레이딩 연습 서비스입니다. 가상 캔들 차트를 보고 계획(셋업·손절·목표)을 먼저 세우고, 결과가 공개되기 전에 자신의 판단을 스스로 채점한 뒤에야 손익을 확인합니다. 성과는 항상 R(손절폭 = 1R) 단위로만 표시하며, 실제 종목 추천이나 투자 자문이 아닙니다.

## 기술 스택

- Next.js 15 (App Router) · React 19 · TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui, lightweight-charts, recharts
- Zustand (클라이언트 상태)
- Supabase (인증 + Postgres)
- Anthropic Claude API (선택적 AI 코치 조언 기능)
- Vitest

## 시작하기

```bash
npm install
```

`.env.local` 파일을 만들고 다음 값을 채워주세요.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 앱에서는 쓰지 않음 — 관리/테스트 스크립트 전용
ANTHROPIC_API_KEY=              # AI 코치 조언 기능에 필요 (없어도 나머지 기능은 정상 동작)
```

DB 스키마는 `supabase/migrations/*.sql`을 Supabase 대시보드의 SQL 편집기에 직접 붙여넣어 적용합니다(별도 마이그레이션 실행기 없음).

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다. 로그인은 비밀번호 없이 이메일 매직링크로만 진행됩니다.

## 명령어

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (타입 체크·린트 포함)
npm run lint     # eslint
npm test         # vitest 전체 실행
npm run test:watch
```

`npm run build`를 실행한 뒤 `npm run dev`를 다시 돌리려면 먼저 `.next/`를 지워야 합니다(공유 빌드 디렉터리 충돌 방지).

## 배포

`main` 브랜치에 푸시하면 Vercel에 자동 배포됩니다. Vercel 프로젝트 환경변수에도 위와 같은 값을 등록해야 합니다.

## 더 알아보기

- 코드 구조와 아키텍처는 [`CLAUDE.md`](./CLAUDE.md)를 참고하세요.
- 원래 제품 기획과 원칙은 [`REPS_바이브코딩_프롬프트팩.md`](./REPS_바이브코딩_프롬프트팩.md)를 참고하세요(일부 규칙은 이후 코드에서 갱신되었으며, `CLAUDE.md`의 "Where the spec is outdated" 절에 정리되어 있습니다).
