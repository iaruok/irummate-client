import { http, type HttpHandler } from 'msw';

import { mswAccessToken } from '../fixtures/session';
import { getSessionScenario } from '../scenarios/session';
import { fail, ok } from './envelope';

// terms 핸들러 (iaruok 담당). 이 feature 담당자만 이 파일을 고친다.
// 서버 동의 API(/api/privacy/consents) 흉내. 응답 모양은 서버 PrivacyConsentController와 같다.

// 서버의 현재 동의서 버전(PrivacyConsentService). 클라이언트 약관 설정의 버전과 같아야 한다.
export const mswConsentDocumentVersion = '1.0';

type ConsentStatus = 'NOT_DECIDED' | 'AGREED' | 'DECLINED' | 'WITHDRAWN';

function consentView(type: 'PROFILE_COLLECTION' | 'AI_CERT_TRAINING', status: ConsentStatus) {
  const decided = status !== 'NOT_DECIDED';
  return {
    type,
    required: type === 'PROFILE_COLLECTION',
    status,
    documentVersion: decided ? mswConsentDocumentVersion : null,
    currentDocumentVersion: mswConsentDocumentVersion,
    updatedAt: decided ? '2026-11-28T00:00:00Z' : null,
  };
}

// 약관 단계만 아직 고르지 않은 상태이고, 그 뒤 단계는 필수 동의·AI 거부로 낸 상태다.
function profileConsentStatus(): ConsentStatus {
  const scenario = getSessionScenario();
  return scenario.session === 'onboarding' && scenario.stage === 'terms' ? 'NOT_DECIDED' : 'AGREED';
}

export const termsHandlers: HttpHandler[] = [
  http.get('*/api/privacy/consents/me', ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${mswAccessToken}`) {
      return fail(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
    }
    const profile = profileConsentStatus();
    const ai: ConsentStatus = profile === 'AGREED' ? 'DECLINED' : 'NOT_DECIDED';
    return ok({ consents: [consentView('PROFILE_COLLECTION', profile), consentView('AI_CERT_TRAINING', ai)] });
  }),
];
