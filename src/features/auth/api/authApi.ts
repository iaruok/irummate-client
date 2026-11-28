// 인증 API 4종. 경로와 함수 이름은 서버 컨트롤러(AuthController·UserController)의 operationId에 맞춘다.
// 재발급(POST /api/auth/refresh)은 shared/api의 refreshAccessToken 한 곳에서만 만든다.
import { apiClient, AppError, publicClient, unwrap, type ApiEnvelope } from '@shared/api';

import { readAuthStatus, type AuthStatusUser } from '../model/authStatus';
import { readProfileConsentAgreed } from '../model/profileConsent';

// GET /api/auth/status (operationId: status). 비로그인이면 서버가 200 + authenticated: false를 주고, 그때 null.
export async function fetchAuthStatus(): Promise<AuthStatusUser | null> {
  const response = await apiClient.get<ApiEnvelope<unknown>>('/api/auth/status');
  return readAuthStatus(unwrap(response.data));
}

// GET /api/privacy/consents/me (operationId: findMine) → 필수 동의(PROFILE_COLLECTION) 여부.
// 인증 상태 응답에는 동의 필드가 없어서, 가입 단계 판정에 필요할 때만 따로 묻는다.
export async function fetchProfileConsentAgreed(): Promise<boolean> {
  const response = await apiClient.get<ApiEnvelope<unknown>>('/api/privacy/consents/me');
  return readProfileConsentAgreed(unwrap(response.data));
}

// GET /api/auth/kakao/callback?code= (operationId: kakaoCallback). 공개 클라이언트로 보내 재발급 쿠키를 받는다.
// 돌려받은 접근 토큰은 저장하지 않고 넘긴다. 저장과 사용자 확인은 AuthContext의 로그인 완료가 한다.
export async function kakaoCallback(code: string): Promise<string> {
  const response = await publicClient.get<ApiEnvelope<{ accessToken?: unknown } | null>>('/api/auth/kakao/callback', {
    params: { code },
  });
  const accessToken = unwrap(response.data)?.accessToken;
  // 서버가 응답 형식을 어긴 경우. 서버 오류 기본 문구를 보인다.
  if (typeof accessToken !== 'string' || !accessToken) throw new AppError({ kind: 'server' });
  return accessToken;
}

// POST /api/auth/logout (operationId: logout). 서버가 재발급 쿠키를 지운다.
export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/logout');
}

// DELETE /api/users/me (operationId: withdraw)
export async function withdraw(): Promise<void> {
  await apiClient.delete('/api/users/me');
}
