import type { components } from '@shared/api/generated/schema';

// 서버 인증 상태 응답(GET /api/auth/status) → 단계 판정에 쓰는 사용자.
// 서버 값의 이름은 백엔드 enum과 같게 둔다(UserRole·UserStatus·CertificationStatus).
// 생성 타입은 응답 필드가 모두 선택(?)이고 값이 string이라, 여기서 한 번 좁혀 둔다.
type AuthStatusResponse = components['schemas']['AuthStatusResponseDto'];

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'WITHDRAWN';
// NONE: 이번 학기 인증 요청 없음. EXPIRED: 승인됐지만 기간이 끝남(새 학기 재인증 필요).
export type CertificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface AuthStatusUser {
  id: string;
  nickname: string;
  // 알 수 없는 값은 null. 판정 함수가 로그인 단계로 보낸다.
  role: UserRole | null;
  status: UserStatus | null;
  certificationStatus: CertificationStatus;
  detailsCompleted: boolean;
  surveyCompleted: boolean;
  // 필수 동의(PROFILE_COLLECTION) 여부. 인증 상태 응답에는 없고, 서버 동의 기록에서 채운다(ADR 0009).
  // null: 묻지 않음. 기본 정보를 냈으면 서버가 이미 동의를 확인했으므로 묻지 않는다.
  termsAgreed: boolean | null;
}

const ROLES: readonly UserRole[] = ['USER', 'ADMIN'];
const STATUSES: readonly UserStatus[] = ['ACTIVE', 'BANNED', 'WITHDRAWN'];
const CERTIFICATION_STATUSES: readonly CertificationStatus[] = ['NONE', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];

function pick<T extends string>(allowed: readonly T[], value: unknown): T | null {
  return allowed.find((item) => item === value) ?? null;
}

// 로그인하지 않았거나 사용자를 알아볼 수 없으면 null.
// 빠진 완료 표시는 "미완료"(false), 빠지거나 모르는 인증 상태는 "요청 없음"(NONE)으로 본다.
export function readAuthStatus(raw: unknown): AuthStatusUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const { authenticated, user } = raw as AuthStatusResponse;
  if (authenticated !== true || !user || typeof user !== 'object') return null;
  if (typeof user.id !== 'string' || !user.id) return null;

  return {
    id: user.id,
    nickname: typeof user.nickname === 'string' ? user.nickname : '',
    role: pick(ROLES, user.role),
    status: pick(STATUSES, user.status),
    certificationStatus: pick(CERTIFICATION_STATUSES, user.certificationStatus) ?? 'NONE',
    detailsCompleted: user.detailsCompleted === true,
    surveyCompleted: user.surveyCompleted === true,
    termsAgreed: null,
  };
}
