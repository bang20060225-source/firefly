# 반딧불이 (Firefly)

> 말하지 않아도, 안부가 닿는 곳.

사회적 고립과 외로움을 경험하는 사람들을 위한 비징벌적·저자극 디지털 안전 기지입니다.
제품 원칙과 전체 명세는 [`CLAUDE.md`](./CLAUDE.md)에 있습니다.

---

## 지금 상태 (MVP 0.1)

| 구분 | 상태 |
| --- | --- |
| 화면 (온보딩, 밤하늘, 나의 방, 작은 행동, 설정, 도움받기, 개인정보 안내) | ✅ 구현, 브라우저에서 확인 |
| DEMO 모드 (서버 없이 이 기기에서만 동작) | ✅ 동작 확인 |
| 데이터베이스 · 보안 규칙 · 서버 함수 (`supabase/migrations`) | ✅ 작성, 로컬 PostgreSQL에서 테스트 통과 |
| 실제 Supabase 프로젝트 연결 | ⏳ **아직 연결 안 됨** — 아래 "Supabase 연결하기" 필요 |
| 계정 탈퇴 Edge Function | ⏳ 작성됨, 배포·실행 확인 안 됨 |
| 이메일 계정 연결 | ⏳ 코드 작성됨, 실제 메일 발송 확인 안 됨 |
| 만 14세 미만 이용 | 🚫 **차단 상태** — 적법한 보호자 확인 수단이 준비될 때까지 열지 않음 |

Supabase 키가 없으면 앱은 자동으로 **DEMO 모드**로 실행되고, 화면 맨 위에 보라색 `DEMO` 띠가 표시됩니다.
DEMO 모드에서는 다른 사용자가 존재하지 않으며, 밤하늘에는 내가 남긴 불빛만 보입니다. 가짜 사용자 불빛은 만들지 않습니다.

---

## 처음 실행하기

필요한 것: [Node.js](https://nodejs.org) 20.19 이상

```bash
cd firefly
npm install
npm run dev
```

터미널에 나오는 주소(보통 http://localhost:5173)를 브라우저에서 열면 됩니다.
휴대폰 화면처럼 보려면 브라우저 개발자 도구(F12)에서 모바일 보기를 켜 주세요.

### 자주 쓰는 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (코드를 고치면 바로 반영) |
| `npm run build` | 타입 검사 후 배포용 파일을 `dist/`에 만들기 |
| `npm run preview` | 빌드한 결과를 미리 보기 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run test` | 단위 테스트 (Vitest) |
| `npm run test:db` | 데이터베이스 보안 테스트 (로컬 PostgreSQL 필요, 아래 참고) |

---

## Supabase 연결하기

### 1. 프로젝트 만들기

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **Authentication → Sign In / Providers**
   - **Allow anonymous sign-ins** 켜기 (익명 시작)
   - **Allow manual linking** 켜기 (나중에 이메일 연결)
   - 익명 가입 남용을 막기 위해 CAPTCHA(Turnstile) 설정을 권장합니다.
3. **Authentication → URL Configuration**에 실제 서비스 주소와 `http://localhost:5173`을 추가합니다. (이메일 링크가 돌아올 주소)
4. **Realtime → Settings**에서 **Allow public access를 끕니다.** (비공개 채널만 허용 → 로그인한 이용 가능 사용자만 밤하늘 방송을 받음)

### 2. 데이터베이스 만들기

```bash
npx supabase login
npx supabase init          # 처음 한 번. 기존 migrations 폴더는 그대로 둡니다
npx supabase link --project-ref <프로젝트-ref>
npx supabase db push       # supabase/migrations 의 SQL을 적용
```

> ⚠️ `supabase/tests/local-supabase-shim.sql`은 **로컬 테스트 전용**입니다. 실제 프로젝트에 절대 적용하지 마세요.

### 3. 계정 탈퇴 함수 배포

```bash
npx supabase functions deploy delete-account
```

서버 비밀 키는 Supabase가 함수 안에 자동으로 넣어 줍니다. 직접 어디에도 붙여 넣을 필요가 없습니다.

### 4. 환경변수 넣기

```bash
cp .env.example .env.local
```

`.env.local`을 열고 Supabase 대시보드 **Project Settings → API Keys**의 값을 넣습니다.

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- `VITE_`로 시작하는 값은 브라우저에 그대로 보입니다. **publishable key만** 넣으세요.
- `sb_secret_...`, `service_role` 키는 **절대** 넣지 마세요.
- `.env.local`은 Git에 올라가지 않습니다 (`.gitignore`에 포함).

다시 `npm run dev`를 실행하면 DEMO 띠가 사라지고 실제 서버에 연결됩니다.

---

## Vercel 배포 준비

`vercel.json`이 준비되어 있습니다. 배포는 **직접 결정한 뒤에** 진행해 주세요.

1. GitHub 저장소를 Vercel에 연결
2. Vercel 프로젝트 **Settings → Environment Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 추가
3. 배포 전 `npm run build`와 `npm run test`가 통과하는지 확인

---

## 폴더 구조

```
firefly/
├─ CLAUDE.md                  제품 원칙과 개발 명세 (가장 먼저 읽기)
├─ src/
│  ├─ main.tsx                앱 시작점
│  ├─ App.tsx                 화면 고르기
│  ├─ config.ts               환경변수, DEMO 모드 판단
│  ├─ types.ts                공통 데이터 모양
│  ├─ index.css               색·글꼴·움직임 (디자인 토큰)
│  ├─ app/                    앱 상태 (세션, 설정, 밤하늘 실시간)
│  ├─ components/             공통 UI, 밤하늘·창문·불빛·파동
│  ├─ screens/                각 화면
│  ├─ services/               서버 연결 (Supabase / DEMO)
│  ├─ lib/                    규칙 로직 (불빛 만료·페이드, 작은 행동) + 테스트
│  └─ data/                   작은 행동 목록, 도움 기관 목록
├─ supabase/
│  ├─ migrations/             테이블, RLS, 서버 함수
│  ├─ functions/delete-account/  계정 탈퇴 Edge Function
│  └─ tests/                  로컬 DB 보안 테스트
└─ public/                    아이콘
```

### 디자인을 바꾸고 싶다면

- **색·글꼴**: `src/index.css`의 `@theme` 안 색 값
- **밤하늘 배경·별·언덕**: `src/components/sky/NightSky.tsx`
- **불빛 모양**: `src/components/sky/SkyLights.tsx`
- **창문**: `src/components/sky/MyWindow.tsx`
- **버튼·카드·스위치**: `src/components/ui.tsx`
- **문구**: 각 `src/screens/*.tsx`

---

## 핵심 규칙이 어디에 있나

| 규칙 | 브라우저 | 서버 (실제 강제) |
| --- | --- | --- |
| 불빛 120분 유지, 마지막 15분 페이드 | `src/lib/lightRules.ts` | `publish_light()` — 서버 시간 기준 |
| 사용자당 활성 불빛 1개, 만료 시간 연장 없음 | — | `presence_lights.owner_id unique` + `publish_light()` |
| 새 불빛 30초 간격, 온기 30초 간격 | 버튼 잠시 쉬기 | `user_rate_limits` + 서버 함수 |
| 공개 데이터에 사용자 ID 없음 | — | `presence_lights`는 직접 읽기 불가, `_light_public_json()`만 공개 |
| private 전환 시 공개 불빛 취소 | — | `user_settings` 트리거 |
| 만 14세 미만 이용 불가 | 계정을 만들지 않음 | `has_service_access()`, 테이블 제약 |
| 작은 행동 기록 비공개 | 기기에 오늘 하루치만 | 서버에 저장하지 않음 |

숫자를 바꿀 때는 `src/lib/lightRules.ts`와 `supabase/migrations`의 SQL을 **함께** 바꿔야 합니다.

---

## 테스트

### 단위 테스트

```bash
npm run test
```

불빛 만료·페이드·남은 시간 문구, 작은 행동의 하루 한 개·누적 없음·금지 문구 검사 (22개).

### 데이터베이스 보안 테스트

로컬 PostgreSQL이 있으면 실행할 수 있습니다. Supabase의 역할·스키마를 흉내 낸 뒤 마이그레이션을 적용하고 64개 규칙을 확인합니다.

```bash
npm run test:db
```

익명 접근 차단, 다른 사람 데이터 접근 차단, 연령 확인, 중복 불빛 방지, 만료, 요청 제한, 실시간 방송 권한, 계정 삭제 시 데이터 삭제 등을 검사합니다.

> 흉내 스키마이므로 실제 Supabase와 100% 같지는 않습니다. 실제 프로젝트 연결 후 한 번 더 확인이 필요합니다.

---

## 출시 전 꼭 확인할 것

- [ ] 만 14세 미만 법정대리인 동의·확인 수단 (법률 검토)
- [ ] 이용약관, 개인정보 처리방침 확정 (현재 `draft-2026-11-06` 초안)
- [ ] 도움 기관 번호·운영시간·링크를 공식 자료로 확인 후 `src/data/helpContacts.ts`의 `HELP_INFO_VERIFIED`를 `true`로
- [ ] 이메일 연결 실제 동작 확인 (메일 발송, 이미 쓰인 이메일 충돌 안내)
- [ ] 만료 불빛 정리 작업 운영 방식 (`cleanup_expired_lights()` 실행 주기)
- [ ] 오래된 익명 계정 정리 정책
- [ ] Supabase 사용량·비용 한도
- [ ] 실제 도메인, Vercel 배포 계정
- [ ] 최종 디자인 시안
