import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const publicPaths = ['/login', '/forgot-password', '/change-password', '/'];
  const isPublic = publicPaths.includes(location.pathname);

  // Allow access to public paths
  if (isPublic) return children;

  // Redirect if not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Redirect if role mismatch
  if (role && user.role !== role) {
    return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  }

  // Force password change
  if (!user.passwordChanged && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}
