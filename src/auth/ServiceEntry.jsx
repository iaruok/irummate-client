import { Navigate, useNavigate } from 'react-router-dom';
import PrivacyConsentModal from '../components/PrivacyConsentModal.jsx';
import { useAuth } from './AuthContext.jsx';
import {
  getServiceDestination,
  getServiceStage,
  SERVICE_STAGES,
} from './serviceFlow.js';

const PRIVACY_CONSENT_KEY = 'privacyConsent';
const PRIVACY_CONSENT_VERSION = '2026-07-22';

function ServiceEntry() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleAgree = (agreements) => {
    localStorage.setItem(
      PRIVACY_CONSENT_KEY,
      JSON.stringify({
        ...agreements,
        agreedAt: new Date().toISOString(),
        version: PRIVACY_CONSENT_VERSION,
      }),
    );
    navigate('/onboarding', { replace: true });
  };

  const handleDecline = async () => {
    localStorage.removeItem(PRIVACY_CONSENT_KEY);

    try {
      await logout();
    } catch (error) {
      console.error('동의 거부 후 로그아웃 실패:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (getServiceStage(currentUser) === SERVICE_STAGES.CONSENT) {
    return (
      <PrivacyConsentModal
        open
        onAgree={handleAgree}
        onDecline={handleDecline}
      />
    );
  }

  return <Navigate to={getServiceDestination(currentUser)} replace />;
}

export default ServiceEntry;
