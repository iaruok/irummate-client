import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postKakaoAuthCode } from '../../api/auth/kakaoLogin.js';
import { useAuth } from '../../auth/AuthContext.jsx';

function KakaoCallback() {
  const navigate = useNavigate();
  const { login, refreshCurrentUser } = useAuth();
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;

    requestedRef.current = true;

    const authCode = new URLSearchParams(window.location.search).get('code');

    if (!authCode) {
      console.error('Kakao authorization code is missing.');
      navigate('/login', { replace: true });
      return;
    }

    async function requestAccessToken() {
      try {
        const responseBody = await postKakaoAuthCode(authCode);
        const accessToken = responseBody?.data?.accessToken;

        if (!accessToken) {
          throw new Error('Kakao response does not include an access token.');
        }

        login(accessToken);
        await refreshCurrentUser();
        navigate('/entry', { replace: true });
      } catch (error) {
        console.error('Access token issuance failed:', error);
        navigate('/login', { replace: true });
      }
    }

    requestAccessToken();
  }, [login, navigate, refreshCurrentUser]);

  return (
    <main className="grid min-h-dvh place-items-center bg-brand-background">
      <p className="text-sm text-fg-basic-muted">Logging in...</p>
    </main>
  );
}

export default KakaoCallback;
