# 반딧불이 (Firefly)

> 말하지 않아도, 안부가 닿는 곳.

사회적 고립과 외로움을 경험하는 사람들을 위한 비징벌적·저자극 디지털 안전 기지입니다.
제품 원칙과 전체 명세는 [`CLAUDE.md`](./CLAUDE.md)에 있습니다.

---

## 지금 상태 (MVP 0.5)

| 구분 | 상태 |
| --- | --- |
| 화면 (온보딩, 밤하늘, 나의 방, 작은 행동, 설정, 도움받기, 개인정보 안내) | ✅ 구현, 브라우저에서 확인 |
| DEMO 모드 (서버 없이 이 기기에서만 동작) | ✅ 동작 확인 |
| 데이터베이스 · 보안 규칙 · 서버 함수 (`supabase/migrations`) | ✅ 작성, 로컬 PostgreSQL에서 테스트 통과 |
| 실제 Supabase 프로젝트 연결 | ⏳ 연결 진행 중 — 아래 "Supabase 연결하기" 참고 |
| 계정 탈퇴 Edge Function | ⏳ 작성됨, 배포·실행 확인 안 됨 |
| 이메일 계정 연결 | ⏳ 코드 작성됨, 실제 메일 발송 확인 안 됨 |
| 만 14세 미만 이용 | 🚫 **차단 상태** — 적법한 보호자 확인 수단이 준비될 때까지 열지 않음 |

Supabase 키가 없으면 앱은 자동으로 **DEMO 모드**로 실행되고, 화면 맨 위에 보라색 `DEMO` 띠가 표시됩니다.
DEMO 모드에서는 다른 사용자가 존재하지 않으며, 밤하늘에는 내가 남긴 불빛만 보입니다. 가짜 사용자 불빛은 만들지 않습니다.

발표·시연용으로 DEMO 모드에서만 **"사람이 많을 때의 예시 하늘 보기"** 버튼이 있습니다.
켜면 하늘에 항상 `예시 화면 · 실제 사람의 불빛이 아니에요` 표시가 붙고, 실제 서버에 연결된 서비스에서는 이 버튼이 나타나지 않습니다.
(예시 불빛 목록: `src/data/exampleSky.ts`)

## 화면 구성 요약

| 화면 | 담긴 것 |
| --- | --- |
| 밤하늘 (홈) | 시간대에 따라 바뀌는 하늘(새벽·낮·저녁·밤), 오늘의 실제 달, 창문 마을(불 켜진 창문 = 누군가의 불빛), 떠다니는 불빛, 내 창문에서 떠오르는 불빛, 다른 사람의 온기가 닿았을 때의 조용한 알림 |
| 나의 방 | 나만 보는 방 장면, 눌러 볼 수 있는 물건(스탠드·양말·화분·머그컵·책), 글귀가 적힌 작은 책, 창밖에 비치는 내 불빛, 접어 둔 공개 설정 |
| 작은 행동 | 하루 한 개, 해봤어요·다른 걸로·오늘은 쉴래요, 자리에서 할 수 있는 것만 보기 |
| 설정 | 공개 방식, 움직임 줄이기, 배경음·효과음(기본 꺼짐), 진동, 계정 연결, 삭제 |
| 도움받기 | 119·109·1577-0199·1388·지역 정신건강복지센터 |

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

## Supabase 연결하기 (웹 화면만으로)

Supabase를 연결하면 DEMO 모드가 꺼지고, 여러 사람이 **같은 밤하늘**을 보게 됩니다.
터미널 없이 Supabase·Vercel 웹 화면에서만 진행할 수 있어요.

### 1. 프로젝트 만들기
1. [supabase.com](https://supabase.com) → **Start your project** → GitHub 계정으로 로그인
2. **New project** → 이름 `firefly`, 데이터베이스 비밀번호는 자동 생성(따로 보관), 지역은 **Northeast Asia (Seoul)**
3. 무료(Free) 요금제로 충분합니다. 1주일 동안 아무도 쓰지 않으면 일시정지되고, 대시보드에서 다시 켤 수 있어요.

### 2. 데이터베이스 만들기 (SQL 한 번 붙여넣기)
1. GitHub 저장소에서 `supabase/migrations/20261106000000_firefly_init.sql` 파일을 열고 **Copy raw file** 버튼으로 전체 복사
2. Supabase 대시보드 → **SQL Editor** → **New query** → 붙여넣기 → **Run**
3. `Success. No rows returned`가 나오면 완료

> ⚠️ `supabase/tests/local-supabase-shim.sql`은 **로컬 테스트 전용**입니다. Supabase에 붙여넣지 마세요.

### 3. 로그인·실시간 설정
- **Authentication → Sign In / Providers** → **Allow anonymous sign-ins** 켜기 (가입 없이 시작)
- **Authentication → Rate Limits** → 같은 와이파이에서 여러 명이 동시에 시작한다면 익명 로그인 한도(기본: IP당 시간당 30회)를 늘리기
- **Authentication → URL Configuration** → **Site URL**에 Vercel 주소(예: `https://firefly-xxxx.vercel.app`) 넣기
- **Realtime → Settings → Channel restrictions** → 공개 채널 허용(public access) 끄기 (로그인한 이용자만 밤하늘 방송을 받도록)

### 4. 계정 탈퇴 함수 만들기
1. **Edge Functions** → **Deploy a new function** → **Via Editor**
2. 함수 이름: `delete-account`
3. 저장소의 `supabase/functions/delete-account/index.ts` 내용을 전부 붙여넣기
4. **Deploy function**
5. 함수 상세 화면에 **Enforce JWT Verification**(JWT 확인) 스위치가 있으면 **끄기** — 함수 안에서 로그인 토큰을 직접 확인합니다

서버 비밀 키는 Supabase가 함수 안에 자동으로 넣어 줍니다. 어디에도 직접 붙여 넣지 마세요.

### 5. Vercel에 주소와 키 넣기
1. Supabase → **Project Settings → API Keys**(또는 **Connect** 버튼)에서 두 값을 확인
   - Project URL: `https://xxxx.supabase.co`
   - **Publishable key**: `sb_publishable_...` (예전 화면이라면 `anon` `public` 키)
2. Vercel → 프로젝트 → **Settings → Environment Variables**에서 아래 두 개 추가 (Production, Preview 모두 체크)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

3. **Deployments** → 가장 최근 배포의 **⋯ → Redeploy** (키는 빌드할 때 들어가므로 다시 배포해야 반영돼요)

- `sb_secret_...`, `service_role` 키는 **절대** 넣지 마세요. 브라우저에 그대로 노출됩니다.
- 내 컴퓨터에서 Supabase 모드로 실행하려면 `.env.example`을 복사해 `.env.local`을 만들고 같은 두 값을 넣으면 됩니다.

### 알아둘 점
- **이메일 계정 연결**: Supabase 기본 메일 서버는 프로젝트 팀원 주소로만 메일을 보냅니다. 다른 사람도 쓰려면 Authentication → SMTP Settings에서 메일 서버를 따로 연결해야 해요.
- 문제가 생기면 화면에 작은 회색 글씨로 기술적인 원인(예: `Anonymous sign-ins are disabled`)이 표시됩니다.

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

### 소리

배경음과 효과음은 소리 파일 없이 브라우저가 바로 만듭니다. (`src/lib/audio/`)
- `composer.ts`: 배경음 작곡 규칙 (화음, 종소리, 밤의 풀벌레)
- `sfx.ts`: 물건마다 다른 효과음
- `engine.ts`: 켜고 끄기, 화면을 벗어나면 멈춤

### 책 글귀 바꾸기

`src/data/bookLines.ts`에 한 줄씩 추가하거나 고치면 됩니다. 재촉하거나 치료를 약속하는 말은 쓰지 않아요.

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

불빛 만료·페이드·남은 시간 문구, 작은 행동의 하루 한 개·누적 없음·'자리에서 할 수 있는 것만'·금지 문구, 시간대·실제 달 위상·창문 마을 배정, 배경음 작곡 규칙·책 글귀 검사 (50개).

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
