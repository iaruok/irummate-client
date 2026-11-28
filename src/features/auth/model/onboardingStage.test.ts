import { describe, expect, it } from 'vitest';

import type { AuthStatusUser } from './authStatus';
import { getOnboardingStage, type OnboardingProgress } from './onboardingStage';
import type { OnboardingStage } from './types';

const base: AuthStatusUser = {
  id: 'hash-1',
  nickname: '테스트',
  role: 'USER',
  status: 'ACTIVE',
  certificationStatus: 'NONE',
  detailsCompleted: false,
  surveyCompleted: false,
  termsAgreed: null,
};

const fresh: OnboardingProgress = { introCompleted: false };
const introDone: OnboardingProgress = { introCompleted: true };

describe('getOnboardingStage', () => {
  it.each<[string, Partial<AuthStatusUser> | null, OnboardingProgress, OnboardingStage]>([
    // 1. 로그인
    ['사용자 없음 → login', null, fresh, 'login'],
    ['역할을 알 수 없음 → login', { role: null }, introDone, 'login'],
    ['정지 계정 → login', { status: 'BANNED', certificationStatus: 'APPROVED' }, introDone, 'login'],
    ['탈퇴 계정 → login', { status: 'WITHDRAWN' }, introDone, 'login'],
    ['계정 상태를 알 수 없음 → login', { status: null }, introDone, 'login'],
    // 2. 관리자
    ['관리자 → admin', { role: 'ADMIN' }, fresh, 'admin'],
    ['관리자는 인증 승인이어도 admin', { role: 'ADMIN', certificationStatus: 'APPROVED' }, fresh, 'admin'],
    ['정지된 관리자 → login', { role: 'ADMIN', status: 'BANNED' }, fresh, 'login'],
    // 3. 인증 승인
    ['인증 승인 → certified', { detailsCompleted: true, certificationStatus: 'APPROVED' }, introDone, 'certified'],
    ['인증 승인은 다른 기기(소개 표시 없음)여도 certified', { detailsCompleted: true, certificationStatus: 'APPROVED' }, fresh, 'certified'],
    ['인증 승인은 설문 미완료여도 certified', { detailsCompleted: true, certificationStatus: 'APPROVED', surveyCompleted: false }, fresh, 'certified'],
    // 4. 약관 (termsAgreed: 서버 동의 기록. null이면 묻지 않음)
    ['서버 동의 기록이 미동의 → terms', { termsAgreed: false }, fresh, 'terms'],
    ['소개 표시가 있어도 서버 동의 기록이 미동의 → terms', { termsAgreed: false }, introDone, 'terms'],
    ['동의 기록을 묻지 않았고 기본 정보도 없음 → terms', { termsAgreed: null }, fresh, 'terms'],
    // 5. 소개
    ['서버 동의 기록이 동의 → intro', { termsAgreed: true }, fresh, 'intro'],
    ['기본 정보를 냈으면(서버가 동의 확인) 이 기기에 소개 표시 없음 → intro', { detailsCompleted: true }, fresh, 'intro'],
    // 6. 기본 정보
    ['동의·소개 후 → profile', { termsAgreed: true }, introDone, 'profile'],
    // 7. 심사 중
    ['인증 심사 중 → pending', { detailsCompleted: true, certificationStatus: 'PENDING' }, introDone, 'pending'],
    // 8. 기숙사 인증
    ['기본 정보 완료, 인증 요청 없음 → certification', { detailsCompleted: true }, introDone, 'certification'],
    ['인증 반려 → certification', { detailsCompleted: true, certificationStatus: 'REJECTED' }, introDone, 'certification'],
    ['인증 만료(새 학기) → certification', { detailsCompleted: true, certificationStatus: 'EXPIRED' }, introDone, 'certification'],
  ])('%s', (_name, override, progress, expected) => {
    const user = override === null ? null : { ...base, ...override };
    expect(getOnboardingStage(user, progress)).toBe(expected);
  });
});
