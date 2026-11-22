# 0003. Android·iOS 기기 시험 결과: 재발급 쿠키, 소켓 출처, 카카오 redirect URI

- 날짜: 2026-11-18 (Android), 2026-11-19 (iOS), 2026-11-20 (Android 재시험, axios 경로 시험), 2026-11-21 (Android 사진 업로드 시험)
- 단계: 2단계 (기반) 첫 시험
- 상태: 확인 (첫 기기 시험 완료: Android 실기기는 Capacitor 7·8 모두, iOS는 시뮬레이터. 일부 항목은 아직)
- 결정한 사람: iaruok, uukdo

## 배경

2단계에서 통신·인증을 만들기 전에, 앱 환경에서 1학기 방식이 그대로 동작하는지 기기에서 확인해야 했다(0002 배경). 이 문서는 Android 실기기와 iOS 시뮬레이터 시험의 결과와 그에 따른 결정, 아직 시험하지 못한 항목을 남긴다. 재발급 토큰 방식(① 네이티브 HTTP 쿠키, ② 응답 본문 + 보안 저장소)은 두 플랫폼 결과가 나왔고 결정 2에서 확정했다.

## 시험 조건

- 용어: **실기기**는 물리 휴대폰(Android 폰, iPhone), **시뮬레이터**는 컴퓨터 안의 가상 기기(Xcode 시뮬레이터)를 뜻한다. 이 문서에서는 어느 쪽인지 구분해서 적는다.
- Android 기기: Android 15 삼성 실기기 1대, 디버그 빌드, Capacitor 7.6.10, 네이티브 HTTP(`CapacitorHttp`) 켬
- Android 재시험(2026-11-20): Capacitor 8.6.2로 올린 빌드(`minSdk` 24, `targetSdk` 36)로 같은 다섯 항목을 Android 15 실기기에서 다시 확인했다.
- iOS 기기: iPhone 18 Pro 시뮬레이터(iOS 27.0) 1대, Xcode 27, 디버그 빌드, Capacitor 8.6.2, 네이티브 HTTP 켬
- 서버: test 서버(2학기 서버 `test` 브랜치 배포)
- 방법: 앱 시작 화면을 임시 시험 화면으로 바꿔 `fetch`로 호출했다. 이 화면은 병합하지 않고 `chore/cookie-probe` 브랜치에만 둔다(두 플랫폼에 같은 화면을 쓰기 위해).
- axios 경로 시험(2026-11-20): 앱의 통신 계층(`shared/api/client.ts`)은 `fetch`가 아니라 axios를 쓴다. 같은 시험 화면에 `shared/api`의 클라이언트를 그대로 부르는 버튼 세 개(5·6·7)를 더해 Android 실기기(Capacitor 8.6.2)에서 확인했다.
- 사진 업로드 시험(2026-11-21): 같은 시험 화면에서 인증 사진 업로드 주소를 발급받아(`POST /api/certifications/presigned-url`) `shared/api`의 `uploadToPresignedUrl`로 올렸다. 발급 조건(필수 정보 입력)을 맞추려고 시험 계정에 가짜 기본 정보를 등록했다. 사진은 캔버스로 만든 64×64 JPEG를 썼다(이유는 결과 참고).
- 카카오 인가 코드: 앱 연결(App Links·Universal Links) 없이 시험하기 위해, 기기의 브라우저(iOS는 시뮬레이터 Safari)에서 로그인한 뒤 404 화면 주소창의 `code` 값을 복사해 시험 화면에 붙여 넣었다. `code=` 뒤의 값만 넣어야 한다. `code=`까지 넣으면 서버가 400(`입력값이 유효하지 않습니다.`)을 돌려준다.

## 결과

| 시험 | Android (Capacitor 7, 11-18) | Android (Capacitor 8.6.2, 11-20) | iOS 시뮬레이터 (Capacitor 8.6.2, 11-19) |
| --- | --- | --- | --- |
| 코드 교환(`GET /api/auth/kakao/callback?code=`) 후 재발급 쿠키가 네이티브 쪽에 저장됨 | 통과 | 통과 | 통과 |
| 이어서 `POST /api/auth/refresh`에 쿠키가 실려 가 새 접근 토큰을 받음 | 통과 (403 없음) | 통과 (403 없음) | 통과 (403 없음) |
| 화면 코드에서 `document.cookie`로 재발급 쿠키를 읽을 수 없음 | 통과 | 통과 | 통과 |
| 앱을 완전히 종료한 뒤 다시 열어 `/refresh`를 불러도 쿠키가 실려 감 | 통과 | 통과 | 통과 |
| WebView가 `/ws/chat`에 직접 WebSocket 연결 | **실패** (`close code=1006`, 허용 목록 반영 전) | 통과 (허용 목록 반영 뒤) | 통과 (허용 목록 반영 뒤) |

iOS에서는 재발급 쿠키(`refreshToken`)가 앱의 네이티브 쿠키 저장소(`Library/Cookies`)에 test 서버 도메인으로 저장된 것도 확인했다.

### axios 경로 (Android 실기기, Capacitor 8.6.2, 2026-11-20)

| 시험 | 부른 것 | 결과 |
| --- | --- | --- |
| 5. 코드 교환 | `publicClient.get('/api/auth/kakao/callback', { params: { code } })` | 통과 (200, 접근 토큰 받음) |
| 6. 재발급 | `refreshAccessToken()` | 통과 (쿠키가 axios 경로로도 실려 새 접근 토큰을 받음) |
| 7. 401 후 자동 재발급·재시도 | 틀린 접근 토큰을 넣고 `apiClient.get('/api/users/me')` | 통과 (최종 200, 재발급 1회, 만료 알림 0, 새 토큰이 저장됨) |

- 7번 확인용으로 PC에서 test 서버에 틀린 토큰과 토큰 없는 요청을 보냈고, 둘 다 401이었다.
- 시험 화면에서 `registerAuthHandlers`로 시험용 토큰 보관함을 등록할 때 주의할 점이 있다. `app/main.tsx`가 시험 화면 모듈을 불러온 뒤 실제 보관함을 다시 등록하므로, 모듈을 불러올 때 한 번만 등록하면 덮어써진다. 시험 화면은 버튼을 누를 때마다 다시 등록한다.

### 사진 업로드 (Android 실기기, Capacitor 8.6.2, 2026-11-21)

| 시험 | 결과 |
| --- | --- |
| 업로드 주소에 서명된 헤더(`X-Amz-SignedHeaders`) | `content-type;host;if-none-match` |
| `uploadToPresignedUrl` (헤더 `Content-Type`, `If-None-Match: *`) | 통과 (업로드 성공) |
| 1학기 방식 (헤더 `Content-Type`만) | **실패** (403) |
| 네이티브 HTTP로 `File` 본문 전송 | 통과 (Capacitor가 base64로 바꿔 네이티브로 넘김) |
| WebView의 `<input type="file">`로 고른 사진 읽기 | **실패** (`NotReadableError`. `arrayBuffer()`, `FileReader` 세 가지 모두) |

- `If-None-Match: *`는 2학기 서버(`S3Utils.createUploadUrl`)가 덮어쓰기를 막으려고 업로드 주소에 함께 서명하는 조건이다. 1학기 서버에는 없었다.
- `<input type="file">` 파일을 읽지 못하면, 네이티브 HTTP의 XHR 경로는 오류를 알리지 않고 요청이 끝나지 않는다(`native-bridge.js`의 XHR `send`에서 파일 변환 실패를 처리하지 않음). 시험에서는 업로드 버튼이 응답 없이 멈췄다.
- 네이티브 HTTP의 본문 변환(`convertBody`)은 `File`만 base64로 바꾼다. 일반 `Blob`은 변환하지 않아 올바르게 보내지지 않고, `Uint8Array`는 글자로 해석돼 이미지가 깨진다(코드 확인, 기기에서는 시험하지 않음).
- 발급 API는 사용자별로 5분에 5회까지다(429 `TOO_MANY_REQUESTS`). 시험을 반복할 때 주의한다.
- 디버그 빌드의 logcat에는 Capacitor가 요청 헤더(`Authorization`, 쿠키)와 업로드 주소 전체를 남긴다. 로그를 공유할 때는 가려야 한다.

Android 소켓 실패의 원인은 서버의 출처(Origin) 검사였다. 같은 서버에 출처만 바꿔 연결을 요청한 결과는 아래와 같다. 2026-11-19에 다시 요청했을 때는 앱 출처 두 개가 허용 목록에 들어가 있었다(결정 3 반영).

| 보낸 출처 | 2026-11-18 | 2026-11-19 |
| --- | --- | --- |
| `https://www.irummate.com` (허용 목록) | 400 (출처 검사는 통과) | 101 |
| 출처 없음 | 400 | 101 |
| `https://localhost` (Android 앱) | **403** | 101 |
| `capacitor://localhost` (iOS 앱) | **403** | 101 |
| 관계없는 출처(`https://evil.example.com`) | (요청 안 함) | 403 |

## 결정

1. **카카오 redirect URI는 `https://www.irummate.com/oauth/kakao/callback`을 쓴다.** 1학기 값이고 카카오 콘솔에 등록되어 있다. 서버는 redirect URI를 환경변수(`KAKAO_REDIRECT_URI`) 하나로만 받아 코드 교환에 쓰므로, 서버·카카오 콘솔·클라이언트 `.env`의 값이 같으면 서버 코드는 바꾸지 않는다. 카카오 복귀를 ① App Links·Universal Links로 확정하면 이 값이 그대로 확정되고, ② 카카오 네이티브 로그인으로 바꾸면 이 주소는 관리자 웹에만 쓴다.
   - **0006에서 바뀜:** 이 주소는 출시(운영) 빌드에만 쓴다. 개발 중에는 `https://test.irummate.com/oauth/kakao/callback`을 쓰고, test 서버의 `KAKAO_REDIRECT_URI`도 그 값으로 맞춘다.
2. **재발급은 ①(네이티브 쿠키)로 확정한다.** Android 실기기(Capacitor 7과 8.6.2 모두)와 iOS 시뮬레이터에서 네 항목이 모두 통과했다. Android 실기기에서는 앱이 실제로 쓰는 axios 경로(재발급, 401 후 재시도)도 통과했으므로 `shared/api/client.ts`의 재발급 부분은 바꾸지 않는다. iOS는 시뮬레이터 결과를 첫 기기 시험의 결과로 인정한다. iOS 실기기 시험에서 실패가 나오면 이 결정을 다시 연다. 그때도 두 플랫폼 중 하나라도 실패하면 둘 다 ②로 바꾼다.
3. **앱 출처를 서버의 WebSocket 허용 목록에 추가해 달라고 백엔드에 요청한다.** `WebSocketConfig`의 `setAllowedOriginPatterns`에 `https://localhost`(Android)와 `capacitor://localhost`(iOS)를 더한다. 재발급은 앱 출처에서도 403이 나지 않았으므로 CORS와 `AuthController.TRUSTED_ORIGINS`는 필수가 아니다(일관성을 위해 같이 넣을지는 백엔드가 정한다). 2026-11-19 기준 test 서버에 반영되어 있다.
4. **Capacitor를 8.6.2로 올린다.** Capacitor 7의 iOS 템플릿은 UIScene 방식을 쓰지 않는다. iOS 27부터는 UIKit이 이런 앱을 시작 직후 강제 종료한다(충돌 지점 `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`). 같은 빌드가 iOS 26.5에서는 실행되고 iOS 27.0에서는 종료됐다. Capacitor 8.5부터 UIScene을 지원하므로 8.6.2로 올리고 `ios/`에 `SceneDelegate`를 넣었다. 패키지 버전을 맞춰야 해서 `android/`도 함께 이전했다(compileSdk·targetSdk 36, `minSdk` 24). 빌드에는 JDK 21 이상이 필요하다.
5. **사진 업로드는 `shared/api`의 `uploadToPresignedUrl` 하나로 한다.** 헤더는 `Content-Type`과 `If-None-Match: *`를 항상 싣고, 인증 헤더는 싣지 않는다. 매개변수는 `File`로 제한한다(네이티브 HTTP가 `Blob`을 올바르게 보내지 못함). 멈춤에 대비해 파일 크기에 비례한 시간 제한(최소 15초, 상향 50KB/s 기준)을 둔다.
6. **앱의 사진 선택은 `<input type="file">`이 아니라 사진 플러그인으로 한다.** WebView에서 고른 파일을 읽을 수 없기 때문이다. `shared/platform/photoPicker`의 앱 동작은 플러그인이 돌려준 경로를 `File`로 바꿔 돌려준다. `<input>`은 웹 대체 동작으로만 쓴다.

## 아직 확인하지 못한 것

- 카카오 복귀 방식: 이 도메인에 프론트 배포와 앱 연결 파일(`assetlinks.json`, `apple-app-site-association`)이 필요한데, `www.irummate.com`은 시험 시점(2026-11-19 포함)에 404였다. 도메인 관리자 확인이 필요하다.
- 사진 업로드 후 서버 검증: 서버는 인증 제출(`POST /api/certifications`) 때 올라간 파일의 크기(최대 5MB)와 파일 머리(시그니처)를 검사한다. 네이티브 HTTP가 base64로 넘긴 파일이 원본과 같은 바이트로 저장되는지는 인증 제출까지 해 봐야 확인된다. 3단계 인증 화면에서 확인한다.
- 사진 플러그인으로 고른 사진의 업로드, iOS의 사진 업로드: 3단계 `photoPicker` 앱 동작을 만든 뒤 확인한다.
- iOS 실기기: 서명(Apple Developer 계정)을 설정한 뒤, 2단계 완료 기준(앱에서 로그인 → 재발급 → 로그아웃) 검증 때 함께 확인한다. 특히 앱을 강제 종료한 뒤 재발급이 되는지 본다(시뮬레이터와 쿠키가 디스크에 쓰이는 방식이 다를 수 있다). axios 경로 시험(5·6·7)은 iOS에서 아직 하지 않았다. `chore/cookie-probe`의 같은 시험 화면으로 확인한다.
- 서버 허용 목록의 `http://localhost.com:5173`이 `http://localhost:5173`의 오타인지 백엔드 확인 필요. 2026-11-19에 `http://localhost:5173` 출처는 403이었다.
- 접근 토큰 수명: 기본 15분, `.env.test.example` 예시 60분. 재발급 자동 갱신 시험에서 만료를 기다리지 않도록 test 서버 값을 확인한다.
- Android 15 외의 버전(`minSdk` 24인 Android 7부터 14까지)과 다른 제조사 기기는 시험하지 않았다.
