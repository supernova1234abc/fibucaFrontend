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

  const hasAccess = localStorage.getItem("CLIENT_FORM_ACCESS") === "true";
  console.log("🔐 PrivateRoute check:", { 
    role, 
    userRole: user?.role, 
    allowNewClient, 
    hasAccess,
    userExists: !!user 
  });

  // 1️⃣ Logged-in user with correct role
  if (user?.role === role) {
    console.log("✅ Access granted: User has correct role");
    return <Outlet />;
  }

  // 2️⃣ New client with staff link
  if (allowNewClient && hasAccess) {
    console.log("✅ Access granted: New client with valid staff link");
    return <Outlet />;
  }

  // 3️⃣ Default: deny access
  console.warn("❌ Access denied:", { role, userRole: user?.role, allowNewClient, hasAccess });
  Swal.fire({
    title: "Access Denied",
    text: "You do not have permission to view this page.",
    icon: "warning",
    confirmButtonText: "Go Home"
  }).then(() => window.location.replace("/"));

  return null;
}