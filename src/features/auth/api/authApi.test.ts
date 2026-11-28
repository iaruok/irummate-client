import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { AppError, registerAuthHandlers } from '@shared/api';
import { mswAccessToken } from '@test/msw/fixtures/session';
import { ok } from '@test/msw/handlers/envelope';
import { setSessionScenario } from '@test/msw/scenarios/session';
import { server } from '@test/msw/server';

import { authClientBindings } from '../model/clientBindings';
import { tokenStorage } from '../model/tokenStorage';
import { fetchAuthStatus, fetchProfileConsentAgreed, kakaoCallback } from './authApi';

describe('authApi', () => {
  it('kakaoCallback: 코드를 보내고 접근 토큰을 돌려준다(저장은 하지 않음)', async () => {
    let sentCode: string | null = null;
    server.use(
      http.get('*/api/auth/kakao/callback', ({ request }) => {
        sentCode = new URL(request.url).searchParams.get('code');
        return ok({ accessToken: mswAccessToken });
      }),
    );

    await expect(kakaoCallback('auth-code')).resolves.toBe(mswAccessToken);
    expect(sentCode).toBe('auth-code');
    expect(tokenStorage.get()).toBeNull();
  });

  it('kakaoCallback: 응답에 토큰이 없으면 서버 오류', async () => {
    server.use(http.get('*/api/auth/kakao/callback', () => ok(null)));

    await expect(kakaoCallback('auth-code')).rejects.toMatchObject({ kind: 'server' } satisfies Partial<AppError>);
  });

  it('fetchAuthStatus: 서버가 비로그인(authenticated: false)이라고 하면 null', async () => {
    registerAuthHandlers(authClientBindings);
    tokenStorage.set(mswAccessToken);
    setSessionScenario({ session: 'anonymous' });

    await expect(fetchAuthStatus()).resolves.toBeNull();
  });

  it('fetchAuthStatus: 로그인 상태면 판정용 사용자를 돌려준다', async () => {
    registerAuthHandlers(authClientBindings);
    tokenStorage.set(mswAccessToken);
    setSessionScenario({ session: 'pending' });

    await expect(fetchAuthStatus()).resolves.toMatchObject({ role: 'USER', certificationStatus: 'PENDING' });
  });

  it('fetchProfileConsentAgreed: 약관 단계 사용자는 미동의', async () => {
    registerAuthHandlers(authClientBindings);
    tokenStorage.set(mswAccessToken);
    setSessionScenario({ session: 'onboarding', stage: 'terms' });

    await expect(fetchProfileConsentAgreed()).resolves.toBe(false);
  });

  it('fetchProfileConsentAgreed: 필수 동의를 낸 사용자는 동의', async () => {
    registerAuthHandlers(authClientBindings);
    tokenStorage.set(mswAccessToken);
    setSessionScenario({ session: 'onboarding', stage: 'intro' });

    await expect(fetchProfileConsentAgreed()).resolves.toBe(true);
  });
});
