// src/components/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking session…
      </div>
    );
  }

  // Public paths do not require login
  const publicPaths = ['/login', '/forgot-password', '/change-password', '/'];
  if (!user && publicPaths.includes(location.pathname)) {
    return children;
  }

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
