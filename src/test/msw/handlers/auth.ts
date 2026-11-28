import { http } from 'msw';

import { mswAccessToken, serverUserBase } from '../fixtures/session';
import { getSessionScenario, setSessionScenario, type SessionScenario } from '../scenarios/session';
import { fail, ok } from './envelope';

// 시나리오 → 서버 user 필드. 단계는 클라이언트의 판정 함수가 이 값으로 정한다.
// 약관 동의는 인증 상태 응답에 없고, 서버 동의 기록(handlers/terms.ts)이 시나리오에 맞게 준다(ADR 0009).
// 소개 완료 표시는 서버가 모르는 기기 값이라 시나리오가 따로 채운다(scenarios/session.ts).
function serverUser(scenario: Exclude<SessionScenario, { session: 'anonymous' }>) {
  if (scenario.session === 'certified') {
    return { ...serverUserBase, detailsCompleted: true, certificationStatus: 'APPROVED' };
  }
  if (scenario.session === 'pending') {
    return { ...serverUserBase, detailsCompleted: true, certificationStatus: 'PENDING' };
  }
  switch (scenario.stage) {
    case 'terms':
    case 'intro':
    case 'profile':
      return serverUserBase;
    case 'certification':
      return { ...serverUserBase, detailsCompleted: true };
  }
}

interface AuthHandlerOptions {
  // 테스트에서 재발급을 일부러 실패시킬 때 'fail'
  refresh?: 'ok' | 'fail';
}

// 인증 API 흉내: 재발급·상태 조회·카카오 코드 교환·로그아웃·탈퇴 (2학기 서버 경로·응답 모양)
export function createAuthHandlers({ refresh = 'ok' }: AuthHandlerOptions = {}) {
  return [
    http.post('*/api/auth/refresh', () => {
      // 비로그인은 재발급 쿠키가 없는 상태라 401이다.
      if (refresh === 'fail' || getSessionScenario().session === 'anonymous') {
        return fail(401, 'UNAUTHORIZED', '다시 로그인해 주세요.');
      }
      return ok({ accessToken: mswAccessToken, tokenType: 'Bearer' });
    }),
    http.get('*/api/auth/status', ({ request }) => {
      if (request.headers.get('Authorization') !== `Bearer ${mswAccessToken}`) {
        return fail(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      }
      const scenario = getSessionScenario();
      // 서버와 같이 비로그인은 200 + authenticated: false
      if (scenario.session === 'anonymous') return ok({ authenticated: false, user: null });
      return ok({ authenticated: true, user: serverUser(scenario) });
    }),
    // 로그인하면 비로그인 시나리오를 인증 완료로 바꾼다(가짜 서버에 사용자가 생긴 것처럼).
    // 로그아웃·탈퇴하면 비로그인으로 돌린다. 개발 서버에서 로그인 → 로그아웃을 이어서 시험할 수 있다.
    http.get('*/api/auth/kakao/callback', () => {
      if (getSessionScenario().session === 'anonymous') setSessionScenario({ session: 'certified' });
      return ok({ accessToken: mswAccessToken });
    }),
    http.post('*/api/auth/logout', () => {
      setSessionScenario({ session: 'anonymous' });
      return ok(null);
    }),
    http.delete('*/api/users/me', () => {
      setSessionScenario({ session: 'anonymous' });
      return ok(null);
    }),
  ];
}

export const authHandlers = createAuthHandlers();
