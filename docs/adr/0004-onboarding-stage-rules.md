# 0004. 가입 단계 판정 규칙을 2학기 서버 필드에 맞춤

- 날짜: 2026-11-22
- 단계: 2단계 (기반)
- 상태: 결정됨 (결정 2의 약관 동의 임시 규칙은 0009로 대체)
- 결정한 사람: iaruok (`pending` 단계 추가는 uukdo 검토 필요)

## 배경

가입 단계(`OnboardingStage`)는 서버의 인증 상태 응답(`GET /api/auth/status`)으로 클라이언트가 판정한다. 처음 정한 규칙은 1학기 서버를 기준으로 했다. 1학기 서버에서는 역할 `GUEST`가 "약관 미동의·기본 정보 미입력"을, 계정 상태 `ACTIVE`가 "인증 승인 완료"를 뜻했다. 2학기 서버(`test` 브랜치)를 대조해 보니 두 값의 뜻이 바뀌어 처음 규칙을 그대로 쓸 수 없었다.

2학기 서버의 응답은 `{ authenticated, user }`이고, 판정에 쓰는 `user` 필드는 아래와 같다.

| 필드 | 값 | 뜻 |
| --- | --- | --- |
| `role` | `USER`, `ADMIN` | `GUEST`가 없다 |
| `status` | `ACTIVE`, `BANNED`, `WITHDRAWN` | `ACTIVE`는 "정지·탈퇴가 아님"이라는 기본값이다. 탈퇴하면 `authenticated: false`로 응답한다 |
| `certificationStatus` | `NONE`, `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED` | 이번 학기 인증만 반영한다. `EXPIRED`는 승인 기간이 끝난 것이다 |
| `detailsCompleted` | 참·거짓 | 기본 정보 입력 여부 |
| `surveyCompleted` | 참·거짓 | 생활 패턴 설문 여부 |

`ACTIVE`를 "인증 완료"로 읽으면 가입하자마자 모두 앱 전체에 들어가게 된다. 약관 동의 여부를 알려 주는 필드는 없다.

## 결정

1. **판정 규칙은 아래 표의 순서로 검사한다** (`features/auth/model/onboardingStage.ts`). 처음 맞는 줄의 단계를 돌려준다.

   | 순서 | 조건 | 단계 |
   | --- | --- | --- |
   | 1 | 사용자 없음, 역할을 알 수 없음, `status`가 `ACTIVE`가 아님 | `login` |
   | 2 | `role`이 `ADMIN` | `admin` |
   | 3 | `certificationStatus`가 `APPROVED` | `certified` |
   | 4 | 약관 미동의 (결정 2) | `terms` |
   | 5 | 이 기기에 소개 완료 표시가 없음 | `intro` |
   | 6 | `detailsCompleted`가 거짓 | `profile` |
   | 7 | `certificationStatus`가 `PENDING` | `pending` |
   | 8 | 그 밖(`NONE`, `REJECTED`, `EXPIRED`) | `certification` |

   - 정지 계정(`BANNED`)은 로그인 단계로 보낸다. 안내 문구는 서버 오류 문구를 쓴다.
   - 새 학기에 인증이 만료되면(`EXPIRED`) 기숙사 인증 화면으로 다시 보낸다.
   - 인증 승인(3)을 약관·소개보다 먼저 본다. 1학기 순서와 같다. 다른 기기에서 로그인해도 가입 화면이 다시 나오지 않는다.
   - 빠진 완료 표시는 미완료로 본다. 모르거나 빠진 인증 상태는 `NONE`으로 본다(`features/auth/model/authStatus.ts`).
   - 설문(`surveyCompleted`)은 이 규칙에 넣지 않는다. 첫 설문을 가입 흐름에 넣을지는 아직 정하지 않았다.

2. **(0009로 대체, 2026-11-28)** **약관 동의는 서버 필드가 생길 때까지 임시 규칙으로 판정한다.** 기본 정보를 냈으면(`detailsCompleted`) 동의한 것으로 본다. 그 전에는 이번 실행 중 동의를 눌렀는지를 메모리에만 기억한다. 기본 정보를 입력하기 전에 앱을 껐다 켜면 약관 화면이 한 번 더 나온다. 동의는 기록으로 남아야 하는 정보라 기기 저장소에 두지 않고, 백엔드에 동의 필드 추가를 요청한다.
   - 응답에 동의 필드(`user.termsAgreed`, 이름은 백엔드가 추가할 때 맞춤)가 오면 위 임시 규칙보다 그 값을 먼저 쓴다. MSW는 이 필드를 미리 보내 약관 이후 단계(`intro`·`profile`)를 흉내 낸다.

3. **인증 심사 중을 위한 `pending` 단계를 추가한다.** v1.6 디자인대로 심사 중에도 홈과 앱 전체를 연다(`CertifiedGate`가 `certified`와 `pending`을 통과시킴). 매칭·채팅 화면은 단계가 `pending`이면 심사 중 안내를 띄운다. 이 변경으로 계약 타입 `OnboardingStage`에 값이 하나 늘어난다.

## 영향

- `OnboardingStage`에 `pending`이 늘어난다. 단계별로 나누는 코드(`switch`, `Record<OnboardingStage, ...>`)는 `pending`을 처리해야 한다. 지금 이 처리가 필요한 곳은 `app/router/stageEntry.ts` 하나이고, 이번에 홈으로 연결했다.
- MSW 시나리오에 `?session=pending`을 더했다. 매칭·채팅의 심사 중 안내를 개발 서버에서 확인할 수 있다.
- 세션 사용자(`SessionUser`)를 서버 모양에 맞추는 일은 다음 작업(`AuthContext`)에서 한다. 이 문서의 판정 함수는 서버 응답을 좁힌 `AuthStatusUser`를 입력으로 받는다.

## 백엔드에 요청할 것

- 약관 동의 필드(예: 필수 약관 동의 여부)를 인증 상태 응답에 추가
- 응답 DTO 필드에 필수 표시(`@Schema(requiredMode = REQUIRED)`). 지금은 생성 타입의 응답 필드가 모두 선택이다.
