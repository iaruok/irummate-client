import { describe, expect, it } from 'vitest';

import { readProfileConsentAgreed } from './profileConsent';

const profile = {
  type: 'PROFILE_COLLECTION',
  required: true,
  status: 'AGREED',
  documentVersion: '1.0',
  currentDocumentVersion: '1.0',
  updatedAt: '2026-11-28T00:00:00Z',
};

const ai = {
  type: 'AI_CERT_TRAINING',
  required: false,
  status: 'DECLINED',
  documentVersion: '1.0',
  currentDocumentVersion: '1.0',
  updatedAt: '2026-11-28T00:00:00Z',
};

describe('readProfileConsentAgreed', () => {
  it.each<[string, unknown, boolean]>([
    ['필수 동의가 현재 버전으로 AGREED → 동의', { consents: [profile, ai] }, true],
    ['선택 동의(AI)는 거부여도 상관없음 → 동의', { consents: [ai, profile] }, true],
    ['아직 고르지 않음(NOT_DECIDED) → 미동의', { consents: [{ ...profile, status: 'NOT_DECIDED', documentVersion: null }, ai] }, false],
    ['철회(WITHDRAWN) → 미동의', { consents: [{ ...profile, status: 'WITHDRAWN' }, ai] }, false],
    ['예전 버전에 동의(문서 개정됨) → 미동의', { consents: [{ ...profile, documentVersion: '1.0', currentDocumentVersion: '1.1' }, ai] }, false],
    ['동의 버전이 빠짐 → 미동의', { consents: [{ ...profile, documentVersion: undefined }, ai] }, false],
    ['필수 항목이 없음 → 미동의', { consents: [ai] }, false],
    ['목록이 비어 있음 → 미동의', { consents: [] }, false],
    ['목록이 배열이 아님 → 미동의', { consents: 'AGREED' }, false],
    ['응답 없음 → 미동의', null, false],
    ['객체가 아님 → 미동의', 'ok', false],
  ])('%s', (_name, raw, expected) => {
    expect(readProfileConsentAgreed(raw)).toBe(expected);
  });
});
