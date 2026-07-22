import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { canAccessCertifiedRoutes } from './certificationAccess.js';

function CertifiedRoute() {
  const location = useLocation();
  const { currentUser } = useAuth();

  if (!canAccessCertifiedRoutes(currentUser?.status)) {
    return <Navigate to="/certification" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default CertifiedRoute;
