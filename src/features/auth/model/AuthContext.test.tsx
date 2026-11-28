import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerAuthHandlers } from '@shared/api';
import { mswAccessToken } from '@test/msw/fixtures/session';
import { fail } from '@test/msw/handlers/envelope';
import { setSessionScenario } from '@test/msw/scenarios/session';
import { server } from '@test/msw/server';

import { useSession } from '../hooks/useSession';
import { AuthProvider } from './AuthContext';
import { authEvents } from './authEvents';
import { authClientBindings } from './clientBindings';
import { tokenStorage } from './tokenStorage';

function SessionProbe() {
  const session = useSession();
  return (
    <div>
      <p data-testid="status">{session.status}</p>
      <p data-testid="stage">{session.user?.stage ?? '-'}</p>
      <p data-testid="nickname">{session.user?.nickname ?? '-'}</p>
      <p data-testid="startError">{session.startError ?? '-'}</p>
      {session.retry ? (
        <button type="button" onClick={session.retry}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

function renderSession() {
  registerAuthHandlers(authClientBindings);
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe('AuthContext 시작', () => {
  const storageWrites: string[] = [];

  beforeEach(() => {
    storageWrites.length = 0;
    // 실제 저장 동작은 그대로 두고, 쓰려는 값만 기록한다.
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const original = storage.setItem.bind(storage);
      vi.spyOn(storage, 'setItem').mockImplementation((key: string, value: string) => {
        storageWrites.push(`${key}=${value}`);
        original(key, value);
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('재발급 성공 → 서버 상태로 단계를 판정해 로그인 상태가 된다', async () => {
    setSessionScenario({ session: 'certified' });
    storageWrites.length = 0;
    renderSession();

    expect(text('status')).toBe('loading');
    await waitFor(() => expect(text('status')).toBe('authenticated'));
    expect(text('stage')).toBe('certified');
    expect(text('nickname')).toBe('테스트');
    expect(tokenStorage.get()).toBe(mswAccessToken);
  });

  it('기본 정보 전: 서버 동의 기록이 미동의면 약관 단계', async () => {
    setSessionScenario({ session: 'onboarding', stage: 'terms' });
    renderSession();

    await waitFor(() => expect(text('status')).toBe('authenticated'));
    expect(text('stage')).toBe('terms');
  });

  it('기본 정보 전: 서버 동의 기록이 동의면 앱을 다시 열어도 소개 단계', async () => {
    setSessionScenario({ session: 'onboarding', stage: 'intro' });
    renderSession();

    await waitFor(() => expect(text('status')).toBe('authenticated'));
    expect(text('stage')).toBe('intro');
  });

  it('기본 정보를 냈으면 동의 기록을 묻지 않는다', async () => {
    setSessionScenario({ session: 'certified' });
    const consentRequests = vi.fn();
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/api/privacy/consents/me')) consentRequests();
    });
    renderSession();

    await waitFor(() => expect(text('status')).toBe('authenticated'));
    expect(consentRequests).not.toHaveBeenCalled();
    server.events.removeAllListeners('request:start');
  });

  it('동의 기록 조회 서버 오류 → 비로그인으로 보내지 않고 다시 시도를 기다린다', async () => {
    setSessionScenario({ session: 'onboarding', stage: 'terms' });
    server.use(http.get('*/api/privacy/consents/me', () => fail(500, 'INTERNAL_SERVER_ERROR', '서버 오류')));
    renderSession();

    await waitFor(() => expect(text('startError')).toBe('server'));
    expect(text('status')).toBe('loading');
  });

  it('재발급 401 → 비로그인', async () => {
    setSessionScenario({ session: 'anonymous' });
    renderSession();

    await waitFor(() => expect(text('status')).toBe('anonymous'));
    expect(text('startError')).toBe('-');
    expect(tokenStorage.get()).toBeNull();
  });

  it('재발급 네트워크 실패 → 로그아웃하지 않고 다시 시도를 기다린다', async () => {
    setSessionScenario({ session: 'certified' });
    server.use(http.post('*/api/auth/refresh', () => HttpResponse.error()));
    const expired = vi.fn();
    const unsubscribe = authEvents.subscribe('expired', expired);
    renderSession();

    await waitFor(() => expect(text('startError')).toBe('network'));
    expect(text('status')).toBe('loading');
    expect(expired).not.toHaveBeenCalled();

    // 연결이 돌아온 뒤 다시 시도하면 로그인 상태가 된다.
    server.resetHandlers();
    act(() => screen.getByRole('button', { name: '다시 시도' }).click());

    await waitFor(() => expect(text('status')).toBe('authenticated'));
    expect(text('startError')).toBe('-');
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
    unsubscribe();
  });

  it('상태 조회 서버 오류 → 다시 시도를 기다린다', async () => {
    setSessionScenario({ session: 'certified' });
    server.use(http.get('*/api/auth/status', () => fail(500, 'INTERNAL_SERVER_ERROR', '서버 오류')));
    renderSession();

    await waitFor(() => expect(text('startError')).toBe('server'));
    expect(text('status')).toBe('loading');
  });

  it('요청 한도 초과(429) → 비로그인으로 보내지 않고 다시 시도를 기다린다', async () => {
    setSessionScenario({ session: 'certified' });
    server.use(http.get('*/api/auth/status', () => fail(429, 'TOO_MANY_REQUESTS', '요청이 너무 많습니다')));
    renderSession();

    await waitFor(() => expect(text('startError')).toBe('server'));
    expect(text('status')).toBe('loading');
  });

  it('어느 경우에도 접근 토큰을 기기 저장소에 쓰지 않는다', async () => {
    for (const session of ['certified', 'anonymous'] as const) {
      setSessionScenario({ session });
      storageWrites.length = 0;
      const view = renderSession();
      await waitFor(() => expect(text('status')).not.toBe('loading'));
      expect(storageWrites.filter((write) => write.includes(mswAccessToken))).toEqual([]);
      view.unmount();
      tokenStorage.clear();
    }
  });

  it('로그인 상태에서 만료 알림이 오면 비로그인이 된다', async () => {
    setSessionScenario({ session: 'certified' });
    renderSession();
    await waitFor(() => expect(text('status')).toBe('authenticated'));

    act(() => authEvents.emit('expired'));

    expect(text('status')).toBe('anonymous');
  });
});
