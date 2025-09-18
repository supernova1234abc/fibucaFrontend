import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1️⃣ Wait for user loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking session…
      </div>
    );
  }

  // 2️⃣ Allow public routes (Login, Landing) without redirect
  const publicPaths = ['/login', '/forgot-password', '/change-password', '/'];
  if (!user && publicPaths.includes(location.pathname)) {
    return children;
  }

  // 3️⃣ Redirect to login if not logged in (only for protected routes)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 4️⃣ Check role for protected routes
  if (role && user.role !== role) {
    return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  }

  // 5️⃣ Force password change if needed
  if (!user.passwordChanged && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // 6️⃣ Return children if everything is fine
  return children || (
    <p className="text-center text-red-600">⚠ Missing children in PrivateRoute</p>
  );
}
