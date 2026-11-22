# 0006. 개발용·운영용 도메인 분리(카카오 redirect URI·앱 연결·관리자 웹)

- 날짜: 2026-11-22
- 단계: 2단계 (기반)
- 상태: 제안 (개발용 도메인은 `test.irummate.com`으로 정함. DNS 연결과 test 서버 설정은 백엔드 확인 후 확정)
- 결정한 사람: iaruok (uukdo 공유, 백엔드 확인 필요)
- 바꾸는 결정: 0003 결정 1

## 배경

카카오 로그인 후 앱으로 돌아오는 방식으로 Android App Links·iOS Universal Links(이하 앱 연결)를 먼저 시험하기로 했다. 앱 연결에는 콜백 주소의 도메인에 앱 연결 파일 2개(`/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association`)가 있어야 한다. 서버는 카카오 redirect URI를 환경 변수 하나(`KAKAO_REDIRECT_URI`)로만 받으므로, 관리자 웹도 같은 콜백 주소를 써야 한다. 따라서 콜백 도메인에 관리자 웹(Vercel)을 올리고 앱 연결 파일도 함께 배포하는 구성이 가장 단순하다.

0003 결정 1은 redirect URI를 운영 도메인 `https://www.irummate.com/oauth/kakao/callback`으로 정했다. 그러나 개발 중에 운영 도메인에 관리자 웹을 올리면 다음 문제가 생긴다.

- 누구나 개발 중인 화면에 들어올 수 있고, 검색 엔진에 수집될 수 있다.
- `/api` 프록시가 운영 서버를 가리키면, 아무나 카카오로 로그인할 때 운영 DB에 사용자가 생긴다.
- Vercel 접근 보호(비밀번호)로 막으면 Google·Apple이 앱 연결 파일을 읽지 못하고 카카오의 콜백 이동도 막혀, 앱 연결이 동작하지 않는다.

## 결정

1. **개발용과 운영용 도메인을 나눈다.**

   | | 개발용 | 운영용 |
   | --- | --- | --- |
   | 도메인 | `test.irummate.com` | `www.irummate.com` |
   | 관리자 웹 배포 | Vercel 프로젝트 하나, `main` 배포를 이 도메인의 Production으로 | 출시 때 정함(결정 2) |
   | `/api` 프록시 대상 | test 서버 | 운영 서버 |
   | 카카오 redirect URI | `https://test.irummate.com/oauth/kakao/callback` | `https://www.irummate.com/oauth/kakao/callback` |
   | 서버 `KAKAO_REDIRECT_URI` | test 서버에 개발용 값 | 운영 서버에 운영용 값 |
   | 앱 빌드 | 디버그 빌드 | 출시 빌드 |
   | 앱 연결 파일의 Android 인증서 지문 | 디버그 서명 | Play 앱 서명 |
   | 검색 노출 | 막음(`X-Robots-Tag: noindex`) | 허용 |

   - Vercel에 `test.irummate.com`을 등록할 때 **Production**에 붙이고, 루트 도메인 리다이렉트 옵션("Redirect apex domain to www")은 끈다. Preview에 붙이면 Vercel 기본 접근 보호가 걸려 앱 연결 파일과 카카오 콜백이 막힌다. 리다이렉트 옵션을 켜면 `irummate.com`·`www.irummate.com`이 개발 프로젝트에 함께 붙는다.
   - 환경 변수는 Production 환경에 넣는다. Vercel의 "Production"은 이 프로젝트의 `main` 배포라는 뜻이고, 연결 서버(test 서버)와 환경 변수로 개발용이 된다.
2. **`www.irummate.com`은 출시 전까지 연결하지 않는다.** 출시 준비 때 아래를 정하고 앱 연결 파일(출시 서명 지문)과 함께 올린다.
   - Vercel은 프로젝트당 Production 브랜치가 하나라, `main` 하나로 운영(`www`)과 개발(`test`)을 다른 설정으로 동시에 배포할 수 없다. 운영용 브랜치(예: `release`)를 두고 같은 프로젝트에서 `test`를 Preview(`main` 지정, 접근 보호 끔)로 옮기거나, 운영용 프로젝트를 따로 만든다.
   - `www.irummate.com`은 운영 쪽 Production에 붙이고 루트 도메인 리다이렉트 옵션을 켠다(`irummate.com` → `www`). 루트 도메인을 다른 곳에서 쓰지 않는지 백엔드에 확인하고, 루트는 Vercel이 안내하는 A 레코드를 쓴다.
   - 카카오 redirect URI와 앱 연결 도메인은 `www`만 쓴다. 앱 연결 파일이 `www`에서 리다이렉트 없이 200으로 오는지 확인한다.
   - `/api` 프록시 대상은 `vercel.json` rewrite에 환경 변수를 쓸 수 없어, 환경마다 다르게 두려면 환경 변수를 읽어 넘기는 Vercel 함수가 필요하다. 출시 전까지는 test 서버 주소 하나만 둔다.
3. **클라이언트는 빌드마다 다른 값을 쓴다.** 카카오 redirect URI는 이미 빌드 때 들어가는 환경 변수(`VITE_KAKAO_REDIRECT_URI`)라 코드 변경이 없다. Android `intent-filter`의 도메인은 빌드 종류(debug·release)별 값으로 두고, iOS Associated Domains도 빌드 설정별로 둔다(iOS는 uukdo).
4. 앱 연결로 카카오 복귀가 실제로 되는지는 개발용 도메인에서 기기 시험으로 확인한다. Android Custom Tabs·iOS 앱 안 브라우저가 리다이렉트로 들어온 콜백 주소를 앱에 넘기지 않으면, 카카오 네이티브 로그인(백엔드 API 추가 필요)으로 바꾼다. 결과는 별도 ADR로 남긴다.

## 영향

- 서버 코드는 바꾸지 않는다. test 서버의 환경 변수만 바꾼다.
- 카카오 콘솔에 개발용 redirect URI와 Web 사이트 도메인을 추가한다(redirect URI는 여러 개 등록 가능).
- 개발 중 로그인 기록은 test 서버 DB에만 쌓인다.
- 0003에 적은 앱 기기 시험(fetch·axios 경로)은 브라우저에서 받은 코드를 붙여 넣는 방식이라, redirect URI 값이 바뀌어도 결과에 영향이 없다. 시험할 때는 test 서버의 redirect URI와 같은 주소로 카카오 인증을 시작해야 한다.

## 백엔드에 요청할 것

1. `test.irummate.com` DNS를 Vercel이 안내하는 CNAME으로 연결. 이 주소를 지금 다른 서버(test API 등)가 쓰고 있지 않은지 확인
2. test 서버 `KAKAO_REDIRECT_URI`를 `https://test.irummate.com/oauth/kakao/callback`으로 변경
3. 카카오 콘솔에 위 redirect URI와 Web 사이트 도메인 `https://test.irummate.com` 추가(기존 `www` 주소는 유지)
4. test 서버와 운영 서버의 API 주소(`/api` 프록시 대상) 공유
5. 운영 도메인 `www.irummate.com`의 DNS는 출시 전까지 그대로 둠
