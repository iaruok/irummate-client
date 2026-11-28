import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isAppError, refreshAccessToken } from '@shared/api';

import { fetchAuthStatus, fetchProfileConsentAgreed } from '../api/authApi';
import { createAuthOperationCoordinator } from './authOperationCoordinator';
import { authEvents } from './authEvents';
import { readOnboardingProgress } from './onboardingProgress';
import { getOnboardingStage } from './onboardingStage';
import { toSessionUser } from './sessionUser';
import { tokenStorage } from './tokenStorage';
import type { Session, SessionStartError, SessionUser } from './types';

export const AuthContext = createContext<Session | null>(null);

// 세션을 바꾸는 동작. 같은 feature의 훅(로그인·콜백·로그아웃·탈퇴)만 쓰고 index.ts로 공개하지 않는다.
export interface AuthActions {
  // 카카오 코드 교환으로 받은 접근 토큰을 넣고 사용자를 확인한다. 확인한 사용자를 돌려준다.
  completeLogin(accessToken: string): Promise<SessionUser>;
  // 이 기기의 로그인 정보(메모리 토큰, 이번 실행의 약관 동의)를 지우고 비로그인으로 둔다. 서버 요청은 하지 않는다.
  signOut(): void;
  // 앱 복귀 때 사용자를 다시 확인한다. 세션이 유효하면 true. 실패해도 연결 문제면 지금 상태를 그대로 둔다.
  revalidate(): Promise<boolean>;
}

export const AuthActionsContext = createContext<AuthActions | null>(null);

type SessionState = Pick<Session, 'status' | 'user' | 'startError'>;

const loading: SessionState = { status: 'loading', user: null };
const anonymous: SessionState = { status: 'anonymous', user: null };

// 서버 상태 → 판정 → 화면용 사용자. 판정 규칙은 onboardingStage 한 곳에만 있다.
async function loadSessionUser(): Promise<SessionUser | null> {
  // 앱을 다시 열면 메모리의 접근 토큰이 비어 있다. 기기에서 불러오는 단계 없이 재발급으로 채운다.
  // 로그인 완료 중에는 새 토큰이 이미 들어 있어 재발급하지 않는다.
  if (!tokenStorage.get()) await refreshAccessToken();
  const status = await fetchAuthStatus();
  if (!status) return null;
  // 약관 동의는 기본 정보를 내기 전에만 서버 동의 기록을 묻는다. 낸 뒤라면 서버가 이미 동의를 확인했다(ADR 0009).
  const user = status.detailsCompleted ? status : { ...status, termsAgreed: await fetchProfileConsentAgreed() };
  return toSessionUser(user, getOnboardingStage(user, readOnboardingProgress(user.id)));
}

// 로그인 여부와 상관없는 실패(연결 끊김, 서버 오류, 요청 한도 초과)만 고른다. 이때는 로그아웃하지 않고 다시 시도를 기다린다.
// 429는 다시 로그인해도 같은 제한에 걸리므로 비로그인으로 보내지 않는다.
function startErrorOf(error: unknown): SessionStartError | null {
  if (!isAppError(error)) return 'server';
  if (error.kind === 'network') return 'network';
  if (error.kind === 'server' || error.status === 429) return 'server';
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(loading);

  // 렌더마다 새로 만들지 않도록 처음 한 번만 만든다(StrictMode의 이중 실행에서도 같은 것을 쓴다).
  const [coordinator] = useState(() =>
    createAuthOperationCoordinator<SessionUser>({
      commitAuthenticated: (user) => {
        if (user) {
          setState({ status: 'authenticated', user });
          return;
        }
        // 재발급은 됐는데 서버가 비로그인이라고 하면(탈퇴 직후 등) 토큰을 버린다.
        tokenStorage.clear();
        setState(anonymous);
      },
      // 토큰만 바뀌었고 사용자는 그대로다.
      commitTokenRefreshed: () => {},
      // 비로그인으로 바꿀 때는 접근 토큰도 항상 비운다. 상태 확인이 401이 아닌 4xx(예: 403)로 실패해도 토큰이 남지 않는다.
      commitUnauthenticated: () => {
        tokenStorage.clear();
        setState(anonymous);
      },
      commitBootstrapFailed: (error) => {
        const startError = startErrorOf(error);
        setState(startError ? { ...loading, startError } : anonymous);
      },
      // 복귀 확인은 지금 화면을 두고 하는 확인이라, 연결 끊김·서버 오류·429면 아무것도 바꾸지 않는다(스플래시도 띄우지 않음).
      // 그 밖의 실패는 시작 확인과 같이 비로그인으로 둔다. 401·403은 만료 이벤트가 먼저 처리한다.
      commitRevalidateFailed: (error) => {
        if (startErrorOf(error)) return;
        tokenStorage.clear();
        setState(anonymous);
      },
      loadCurrentUser: loadSessionUser,
      removeAccessToken: () => tokenStorage.clear(),
      setAccessToken: (accessToken) => tokenStorage.set(accessToken),
    }),
  );

  const start = useCallback(() => {
    // 실패는 commitBootstrapFailed가 상태로 남긴다. 여기서는 처리하지 않은 거부만 막는다.
    coordinator.bootstrap().catch(() => {});
  }, [coordinator]);

  const retry = useCallback(() => {
    setState(loading);
    start();
  }, [start]);

  useEffect(() => {
    start();
    const unsubscribeExpired = authEvents.subscribe('expired', coordinator.handleAuthExpired);
    const unsubscribeRefreshed = authEvents.subscribe('tokenRefreshed', coordinator.handleTokenRefreshed);
    return () => {
      unsubscribeExpired();
      unsubscribeRefreshed();
    };
  }, [coordinator, start]);

  const session = useMemo<Session>(
    () => (state.startError ? { ...state, retry } : { status: state.status, user: state.user }),
    [state, retry],
  );
  const actions = useMemo<AuthActions>(
    () => ({
      completeLogin: (accessToken) => coordinator.completeLogin(accessToken),
      signOut: () => {
        tokenStorage.clear();
        // 진행 중이던 상태 확인이 늦게 끝나도 로그인 상태로 되돌리지 못하게 한다.
        coordinator.handleAuthExpired();
      },
      revalidate: () => coordinator.revalidate(),
    }),
    [coordinator],
  );

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
    </AuthActionsContext.Provider>
  );
}
