// src/context/PrivateRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ role, allowNewClient = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasAccess = localStorage.getItem("CLIENT_FORM_ACCESS") === "true";

  // 1️⃣ Logged-in user with correct role
  if (user?.role === role) {
    return <Outlet />;
  }

  // 2️⃣ New client with staff link
  if (allowNewClient && hasAccess) {
    return <Outlet />;
  }

  // 3️⃣ Default: deny access with safe redirect
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const homeByRole = `/${String(user.role || '').toLowerCase()}`;
  return <Navigate to={homeByRole || '/'} replace />;
}