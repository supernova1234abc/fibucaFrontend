// src/components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';

export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking session…
      </div>
    );
  }

  console.log("🔒 PrivateRoute check →", user);

  if (!user) {
    console.warn("🔒 No user found. Redirecting to login...");
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    console.warn(`🔒 Role mismatch: expected ${role}, got ${user.role}. Redirecting…`);
    return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  }

  if (!user.passwordChanged) {
    console.warn("🔒 Password not changed. Redirecting to /change-password");
    return <Navigate to="/change-password" replace />;
  }

  return children || (
    <p className="text-center text-red-600">⚠ Missing children in PrivateRoute</p>
  );
}
