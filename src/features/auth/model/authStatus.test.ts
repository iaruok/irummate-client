import { describe, expect, it } from 'vitest';

import { readAuthStatus, type AuthStatusUser } from './authStatus';

const serverUser = {
  id: 'hash-1',
  nickname: '테스트',
  role: 'USER',
  status: 'ACTIVE',
  certificationStatus: 'PENDING',
  detailsCompleted: true,
  surveyCompleted: false,
};

const expected: AuthStatusUser = {
  id: 'hash-1',
  nickname: '테스트',
  role: 'USER',
  status: 'ACTIVE',
  certificationStatus: 'PENDING',
  detailsCompleted: true,
  surveyCompleted: false,
  termsAgreed: null,
};

describe('readAuthStatus', () => {
  it('서버 응답을 그대로 옮긴다', () => {
    expect(readAuthStatus({ authenticated: true, user: serverUser })).toEqual(expected);
  });

  it.each<[string, unknown]>([
    ['응답 없음', null],
    ['객체가 아님', 'ok'],
    ['비로그인(서버는 200 + authenticated: false)', { authenticated: false }],
    ['authenticated가 빠짐', { user: serverUser }],
    ['사용자가 빠짐', { authenticated: true }],
    ['id가 빠짐', { authenticated: true, user: { ...serverUser, id: undefined } }],
    ['id가 빈 문자열', { authenticated: true, user: { ...serverUser, id: '' } }],
  ])('%s → null', (_name, raw) => {
    expect(readAuthStatus(raw)).toBeNull();
  });

  it.each<[string, Record<string, unknown>, Partial<AuthStatusUser>]>([
    ['모르는 역할 → null', { role: 'MODERATOR' }, { role: null }],
    ['모르는 계정 상태 → null', { status: 'PENDING' }, { status: null }],
    ['모르는 인증 상태 → NONE', { certificationStatus: 'REQUESTED' }, { certificationStatus: 'NONE' }],
    ['인증 상태 빠짐 → NONE', { certificationStatus: undefined }, { certificationStatus: 'NONE' }],
    ['완료 표시 빠짐 → 미완료', { detailsCompleted: undefined, surveyCompleted: undefined }, { detailsCompleted: false, surveyCompleted: false }],
    ['닉네임 빠짐 → 빈 문자열', { nickname: undefined }, { nickname: '' }],
    ['약관 동의는 인증 상태 응답에서 읽지 않음 → null(동의 기록에서 채움)', { termsAgreed: true }, { termsAgreed: null }],
  ])('%s', (_name, userOverride, expectedOverride) => {
    const raw = { authenticated: true, user: { ...serverUser, ...userOverride } };
    expect(readAuthStatus(raw)).toEqual({ ...expected, ...expectedOverride });
  });
});
