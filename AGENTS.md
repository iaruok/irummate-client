# 이룸매이트 2학기 클라이언트 — 작업 규칙

기숙사 룸메이트 매칭과 밥·취미·공동구매 "매이트" 모집을 하는 앱 "이룸매이트"이다. v1.6 디자인(IrumGlass)을 기준으로 1학기 웹 코드를 새 구조로 옮겨 만든다.
이 파일은 강현(iaruok)과 지원(uukdo)이 함께 사용하는 클라이언트 개발 규칙이다. 개인 지침은 각자의 `?.local.md`에 둔다.

## 현재 상태

- 1단계(계약·뼈대)를 마쳤고 2단계(기반)를 시작하기 전이다. 설정 파일(TypeScript strict, Vite, ESLint 계층 규칙, Vitest, Playwright, Capacitor, CI)은 옮겼다. 결정 기록은 `docs/adr/0001-stage1-skeleton.md`.
- `android/`를 만들었다(앱 ID `com.irummate.app`, 네이티브 HTTP 켬). `ios/`는 uukdo가 Mac에서 만든다. 결정 기록은 `docs/adr/0002-native-projects.md`.
- 단계 번호는 1부터 시작한다: 1 계약·뼈대, 2 기반, 3 가입 흐름·MY, 4 룸메이트, 5 통합·검증, 6 관리자. ADR 번호는 결정이 생긴 순번이며 단계 번호와 무관하다. 각 ADR 머리말의 `단계` 줄이 관련 단계를 가리킨다.

## 스택

React · TypeScript(strict) · Vite · TanStack Query · React Router(데이터 라우터) · Tailwind v4(`@theme`) · Capacitor(Android·iOS) · Vitest + Testing Library · MSW · Playwright

## 배포 대상

- 사용자 서비스는 **Android·iOS 앱**으로 낸다. 운영용 사용자 웹은 없다.
- 관리자 화면은 **앱과 관리자 웹** 두 곳에 있다.
  - 앱: 관리자 계정일 때만 관리자 화면 묶음을 지연 로딩한다.
  - 관리자 웹: Vercel에 올린다. 로그인·카카오 콜백·관리자 화면만 등록한다.
- 테스트 배포(`test.irummate.com`)는 확인용이다. 앱 빌드(`npm run build`)를 웹에 올려 사용자 화면과 관리자 화면을 모두 열고, test 서버에 연결한다. 검색 노출은 막는다(ADR 0006 결정 6).
- 빌드 대상 값은 `app` 또는 `admin-web`이다. `shared/config/env.ts`에서만 읽는다.
- 앱 출시(Google Play·App Store)는 관리자 화면까지 모두 만든 뒤다.
- Android와 iOS는 같은 코드로 동작한다. 두 플랫폼의 차이(뒤로가기, 화면 가장자리, 키보드, 딥링크, 보안 저장소, 권한 안내 문구)는 \shared/platform과 각 네이티브 프로젝트 설정에서만 다룬다.
- iOS 빌드·서명은 macOS(Xcode)에서만 된다. 빌드 환경은 uukdo의 Mac과 소모임의 Apple Developer 계정이다(ADR 0002).
- iOS 로그인 방식(App Store 심사 지침 4.8)은 결정 항목이다. 정해지기 전에는 추측해서 만들지 않는다.

## 계층 규칙 (ESLint로 강제)

- 의존 방향은 한 방향이다: `app → pages → features → shared`.
- feature끼리 서로 import하지 않는다. 다른 feature는 그 feature의 `index.ts`(공개 API)로만 쓴다.
- 페이지는 조립만 한다. API 호출과 도메인 규칙은 feature에 둔다.
- 금지 패턴:
  - `shared/api` 밖에서 axios 사용
  - `shared/platform` 밖에서 Capacitor 사용
  - 임의 색상값(색은 디자인 토큰으로만)
  - `console` 출력
  - 경로 문자열 직접 작성(화면 이동은 `app/router/paths.ts`로만)
- 시트·오버레이는 URL 쿼리로 연다. 기록 뒤로가기(history back)로 닫혀야 한다. Android는 뒤로가기 버튼이 이 동작을 부르고, iOS에는 그런 버튼이 없으므로 화면 안에 닫기 수단(닫기 버튼, 바깥 영역 누르기)을 둔다.

## 인증·토큰 규칙 (반드시 지킨다)

- 접근 토큰은 **메모리에만** 둔다(`features/auth/model/tokenStorage.ts`). localStorage·sessionStorage·Preferences·보안 저장소에 쓰지 않는다.
- 앱을 시작하면 `AuthContext`가 재발급을 먼저 한 번 시도한다. 기기에서 토큰을 불러오는 단계는 없다.
- 재발급 토큰:
  - 앱은 **① 네이티브 HTTP(CapacitorHttp) 쿠키**가 기본이다. 실기기 시험에서 실패하면 **② 응답 본문 + 보안 저장소**로 바꾼다.
  - ①과 ②의 차이는 `shared/api/client`의 재발급 전용 부분과 `shared/platform/secureStorage`에만 둔다. 재발급 요청은 그 한 곳에서만 만든다.
  - 관리자 웹은 Vercel 프록시와 HttpOnly 쿠키(1학기 방식)를 쓴다.
- 401이 오면 재발급 후 1회만 재시도한다. 동시에 들어온 재발급 요청은 하나로 합친다. 로그아웃은 401·403일 때만 하고, 네트워크 끊김으로는 하지 않는다.
- 토큰·전화번호·학번은 로그나 오류 기록에 남기지 않는다.
- XSS 방지:
  - `dangerouslySetInnerHTML`을 쓰지 않는다.
  - 사용자가 넣은 링크는 `http`·`https`일 때만 링크로 만든다.
  - 사용자가 입력한 내용은 글자로만 표시한다.

## 가입 단계

- 단계는 `login → terms → intro → profile → certification → (인증 심사 중: 결정 항목) → certified`이고, 관리자는 `admin`이다.
- 단계 판정은 `features/auth/model/onboardingStage.ts`가 한다. 입력은 서버 상태와 소개 완료 표시(`introProgress`) 두 가지다.
  - 소개 완료 표시는 사용자별로 기기에 남긴다. 민감 정보가 아니다.
- 가입 화면은 다음 화면을 직접 정하지 않는다. 제출한 뒤 단계를 다시 판정해서 이동한다.
- 가드:
  - `AuthGate`: 로그인 여부
  - `OnboardingGate`: 가입 단계
  - `CertifiedGate`: certified 단계만 통과
  - `AdminGate`: admin 단계만 통과
- 가드는 화면을 나누는 용도다. 실제 권한은 서버가 검사한다.

## 소유권 (CODEOWNERS와 같다)

- **강현(iaruok)** (계정·룸메이트·관리자)
  - feature: `auth`, `terms`, `profile`, `verification`, `roommate`, `admin`
  - 공통 계층: `app`(`ChatSocketProvider` 제외), `shared/api`, `shared/platform`, `shared/config`
  - 페이지: `pages/onboarding`, `pages/match`, `pages/my`(`NotificationSettingsPage.tsx` 제외), `pages/admin`
- **지원(uukdo)** (디자인 시스템·커뮤니티)
  - feature: `dorm`, `mate-post`, `chat`, `notification`
  - 공통 계층: `shared/styles`, `shared/ui`, `shared/lib`, `shared/assets`, `app/providers/ChatSocketProvider.tsx`
  - 페이지: `pages/home`, `pages/mate`, `pages/chat`, `pages/my/NotificationSettingsPage.tsx`
- 네이티브 프로젝트(`android/`, `ios/`)와 `capacitor.config.ts`는 공동 담당이다. iOS의 플랫폼 코드(`shared/platform`)는 iaruok가 쓰고, `ios/` 생성·Xcode 설정·iOS 실기기 시험은 Mac을 쓰는 uukdo가 맡는다.
- 계약 파일은 바꿀 때 상대의 리뷰가 필요하다: `app/router/paths.ts`, `features/auth/index.ts`, `shared/api/index.ts`, `shared/platform/index.ts`, `shared/ui/index.ts`, `package.json`
- 계약을 바꿀 때는 선택 필드만 추가하는 것을 기본으로 한다. 기존 이름은 바꾸지 않는다. 호환이 깨지는 변경이 불가피하면 구현 전에 상대와 합의하고, PR에 영향 범위와 마이그레이션 방안을 적는다.
- 상대가 소유한 폴더는 고치지 않는다. 필요하면 PR 설명에 요청을 적는다.

## 공통 UI

**uukdo**가 shared/ui/index.ts에 공개한 공통 컴포넌트만 사용한다. 컴포넌트 목록과 사용 규칙은 uukdo가 관리한다.

## 작업 방식

- 브랜치는 두 개를 기준으로 쓴다(ADR 0006).
  - `test`: 개발 통합 브랜치. 기능 브랜치는 여기서 만들고 여기로 병합한다. 병합되면 테스트 배포(`test.irummate.com`, test 서버)에 자동으로 올라간다.
  - `main`: 운영에 나간 코드. `test` → `main` 출시 PR로만 바뀐다. 출시 PR은 merge commit으로 병합한다(squash·rebase는 두 브랜치의 기록을 어긋나게 해 다음 출시 때 충돌이 난다).
- 기능 브랜치는 기능 단위로 만든다(예: `feat/auth-token-storage`). 하루 한 번 이상 `test` 기준으로 rebase한다.
- PR 하나에는 화면 하나, 또는 같은 목적의 파일 묶음 하나(예: `shared/api`, 프로젝트 설정)를 담는다.
- 순수 함수(단계 판정, 금액 계산 등)는 테이블 테스트를 함께 만든다. API가 걸린 동작은 MSW로 시험한다.
- 커밋 전에 `lint`, `typecheck`, `test`를 통과시킨다.
- 구조나 방식이 바뀌는 결정은 `docs/adr/`에 남긴다.
- 백엔드에 없는 API는 MSW 핸들러로 요청·응답 모양을 먼저 정하고, 백엔드에 같이 전달한다.

## 보안

- v1.6 디자인 원본(HTML)은 `draft/`에 커밋해 두고 화면 구현의 기준으로 쓴다. 읽기 쉬운 사본은 `docs-private/design/v1.6-source/`에 있다.
- 이 저장소는 공개(public)다. 디자인 원본에 실제 개인정보나 키가 들어가지 않게 한다. 다음은 커밋하지 않는다:
  - `.env`
  - `docs-private/`
  - `CLAUDE.local.md`
- `.env`는 키 이름만 `.env.example`에 둔다.

## 명령어

- `npm run dev` / `npm run dev:admin-web`: 개발 서버 (앱 / 관리자 웹 빌드 대상)
- `npm run build` / `npm run build:admin-web`: 빌드 → `dist/` / `dist-admin-web/`
- `npm run lint`: ESLint (계층 규칙은 `src/test/eslint/boundaries.test.ts`로도 검사)
- `npm run typecheck`: TypeScript 검사 (`src`·`e2e`와 설정 파일)
- `npm test`: Vitest
- `npm run test:e2e`: Playwright (개발 서버 + MSW)
- `npm run gen:api`: 백엔드 OpenAPI → `src/shared/api/generated/schema.d.ts` (`OPENAPI_URL` 필요)
- `npx cap sync android`: `npm run build` 결과와 플러그인을 `android/`에 반영 (웹 코드나 `capacitor.config.ts`를 바꾼 뒤 실행)
- `npx cap open android`: Android Studio에서 `android/` 열기

## PR 검토 및 병합 규칙

### 기본 원칙

- 모든 기능 변경은 PR을 통해 `test`에 병합한다. `main`에는 `test`에서 오는 출시 PR만 병합한다.
- 출시 PR(`test` → `main`)은 두 사람 모두 확인한 뒤 병합한다.
- `iaruok`의 PR은 `uukdo`, `uukdo`의 PR은 `iaruok`가 검토한다.
- 필수 CI 통과는 모든 PR의 병합 조건이다.
- 아래 Critical Review 항목에 해당하면 상대 개발자의 승인(Approve) 1회를 받은 뒤 병합한다.
- 그 밖의 변경은 상대 개발자의 승인을 **권고**한다. 승인을 기다리기 어려운 경우 예외적으로 PR 작성자가 직접 병합할 수 있다.
  - PR 본문에 직접 병합한 이유를 적고, 병합 후 상대에게 알린다.
  - 상대는 병합 후에도 검토할 수 있다. 문제가 나오면 작성자가 후속 PR로 고친다.

### Critical Review

다음 항목은 **필수 검토 대상**이다. 상대 개발자의 승인 없이 병합할 수 없고, 문제가 해결되기 전까지 병합할 수 없다.

1. **공통 계약 변경:** API, 라우팅, 공개 인터페이스 및 데이터 모델 변경
2. **소유권 변경:** 상대 개발자의 담당 영역을 수정하는 경우
3. **보안 변경:** 인증, 권한, 토큰 관리 및 민감정보 처리 로직 변경
4. **아키텍처 변경:** 프로젝트 구조, 전역 상태 관리, 핵심 라이브러리 변경
5. **기존 기능 영향:** 변경으로 기존 동작이 깨지거나 호환성이 손상되는 경우
6. **검증 실패:** 빌드, 타입 검사, 필수 테스트 및 CI 실패

### 변경 및 승인 절차

- 공통 계약 및 아키텍처 변경은 **구현 전에 상대 개발자와 합의**한다.
- 상대 개발자의 소유 영역을 수정해야 할 경우 사전에 협의한다.
- Breaking Change는 위 계약 규칙에 따라 상대와 합의한 뒤에만 진행하고, 영향 범위와 마이그레이션 방안을 PR에 명시한다.
- 검토자가 Blocking Comment를 남기면 해결 및 재확인 전까지 병합하지 않는다.
- 구조적 의사결정은 `docs/adr/`에 기록한다.

### Merge Policy

- `test`·`main` 직접 push 금지
- 필수 CI 실패 시 병합 금지
- Critical Review 항목에 해당하는 PR은 승인 없이 병합 금지
- 미해결 Blocking Comment가 있는 PR 병합 금지
- Critical Review 항목에 해당하는 PR은 승인 이후 코드 변경 시 재승인 필수
