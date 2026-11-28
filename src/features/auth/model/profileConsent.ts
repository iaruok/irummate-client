import type { components } from '@shared/api/generated/schema';

// 서버 동의 기록(GET /api/privacy/consents/me) → 필수 동의(PROFILE_COLLECTION)를 했는지.
// 서버가 기본 정보 제출 전에 확인하는 조건(PrivacyConsentService.requireProfileConsent)과 같게 본다:
// 상태가 AGREED이고, 동의한 문서 버전이 서버의 현재 버전과 같아야 한다.
// 단계 판정에 쓰는 입력이라 이 feature(auth)에 둔다. 동의 제출은 terms feature가 한다.
type ConsentsResponse = components['schemas']['ConsentsResponse'];

const PROFILE_COLLECTION = 'PROFILE_COLLECTION';
const AGREED = 'AGREED';

// 응답 모양이 어긋나거나 항목이 없으면 미동의로 본다. 약관 화면이 다시 나올 뿐이고,
// 같은 내용을 다시 제출하면 서버가 204로 받는다.
export function readProfileConsentAgreed(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const { consents } = raw as ConsentsResponse;
  if (!Array.isArray(consents)) return false;

  const profile = consents.find((consent) => consent?.type === PROFILE_COLLECTION);
  if (!profile || profile.status !== AGREED) return false;
  return typeof profile.documentVersion === 'string' && profile.documentVersion === profile.currentDocumentVersion;
}
