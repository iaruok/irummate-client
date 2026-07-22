import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import apiClient from '../api/client-api.js';
import {
    getAccessToken,
    setAccessToken,
    removeAccessToken,
} from './tokenStorage.js';
import {
    AUTH_EXPIRED_EVENT,
    TOKEN_REFRESHED_EVENT,
} from './authEvents.js';
import { getCurrentUser } from '../api/auth/authStatus.js';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // 앱이 처음 실행됐을 땐 인증 확인이 아직 끝나지 않음 -> true
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        let isMounted = true;
        
        async function checkAuthentication() {
            try {
                /*
                이미 있는 인증상태 확인 api

                accessToken이 만료됐다면 apiClient의 인터셉터가 자동으로 refresh 후 이 요청 다시 실행
                
                accessToken이 localStorage에 없어도 인증상태 확인 요청이 401을 받으면
                refreshToken 쿠키로 accessToken 재발급을 시도.
                */
                const user = await getCurrentUser();
                
                if(isMounted) {
                    setCurrentUser(user);
                    setIsAuthenticated(true);
                }
            } catch (error) {
                console.error('인증 상태 확인 실패', error);

                if(isMounted) {
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                }
            } finally {
                if (isMounted) {
                    setIsCheckingAuth(false);
                }
            }
        }

        function handleAuthExpired() {
            if (!isMounted) return;

            setIsAuthenticated(false);
            setCurrentUser(null);
            setIsCheckingAuth(false);
        }

        function handleTokenRefreshed() {
            if (!isMounted) return;

            setIsAuthenticated(true);
        }

        window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        window.addEventListener(TOKEN_REFRESHED_EVENT, handleTokenRefreshed);

        checkAuthentication();

        return () => {
            isMounted = false;

            window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
            window.removeEventListener(TOKEN_REFRESHED_EVENT, handleTokenRefreshed);
        };
    }, []);

    function login(accessToken) {
        setAccessToken(accessToken);
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
    }

    async function refreshCurrentUser() {
        const user = await getCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
        return user;
    }

    async function logout() {
        try {
            await apiClient.post('/api/auth/logout', undefined, {
                withCredentials: true,
            });
        } finally {
            removeAccessToken();
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsCheckingAuth(false);
        }
    }

  const value = useMemo(
    () => ({
        accessToken: getAccessToken(),
        isAuthenticated,
        isCheckingAuth,
        currentUser,
        refreshCurrentUser,
        login,
        logout,
    }),
    [currentUser, isAuthenticated, isCheckingAuth],
  );

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);

    if(!context) {
        throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.');
    }

    return context;
}
