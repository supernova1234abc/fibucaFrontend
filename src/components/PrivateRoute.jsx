// src/context/PrivateRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

export default function PrivateRoute({ role, allowNewClient = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 1️⃣ Logged-in user with correct role
  if (user?.role === role) {
    return <Outlet />;
  }

  // 2️⃣ New client with staff link
  if (allowNewClient && localStorage.getItem("CLIENT_FORM_ACCESS") === "true") {
    return <Outlet />;
  }

  // 3️⃣ Default: deny access
  Swal.fire({
    title: "Access Denied",
    text: "You do not have permission to view this page.",
    icon: "warning",
    confirmButtonText: "Go Home"
  }).then(() => window.location.replace("/"));

  return null;
}