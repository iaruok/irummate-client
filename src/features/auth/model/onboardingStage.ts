// 1학기 src/auth/serviceFlow.js 이식. 가입 단계 판정은 이 함수 하나만 한다.
// 가드와 첫 화면 이동은 이 결과만 보고, 다른 파일에 단계 판정 조건문을 쓰지 않는다.
// 규칙은 위에서부터 검사하고 처음 맞는 줄의 단계를 돌려준다. 줄의 순서가 곧 규칙이다(ADR 0004).
import type { AuthStatusUser } from './authStatus';
import type { OnboardingStage } from './types';

export interface OnboardingProgress {
  // 소개 화면을 이 기기에서 끝냈는지(사용자별 기기 표시. 민감 정보 아님).
  introCompleted: boolean;
}

export function getOnboardingStage(user: AuthStatusUser | null, progress: OnboardingProgress): OnboardingStage {
  // 1. 사용자 없음, 역할을 알 수 없음, 정상 계정이 아님(정지 등) → 로그인
  if (!user || user.role === null || user.status !== 'ACTIVE') return 'login';
  // 2. 관리자
  if (user.role === 'ADMIN') return 'admin';
  // 3. 이번 학기 인증 승인 → 앱 전체. 가입 단계보다 먼저 봐서, 다른 기기에서 로그인해도 가입 화면이 다시 나오지 않는다.
  if (user.certificationStatus === 'APPROVED') return 'certified';
  // 4. 약관 미동의. 서버 동의 기록의 값을 본다. 묻지 않았으면(null) 기본 정보를 냈다는 것은
  //    서버가 동의를 확인했다는 뜻이라(동의 없이는 기본 정보 제출이 403) 동의로 본다(ADR 0009).
  const termsAgreed = user.termsAgreed ?? user.detailsCompleted;
  if (!termsAgreed) return 'terms';
  // 5. 소개 미완료
  if (!progress.introCompleted) return 'intro';
  // 6. 기본 정보 미입력
  if (!user.detailsCompleted) return 'profile';
  // 7. 인증 심사 중 → 앱 전체, 매칭·채팅만 심사 중 안내
  if (user.certificationStatus === 'PENDING') return 'pending';
  // 8. 인증 요청 없음·반려·만료 → 기숙사 인증
  return 'certification';
}
