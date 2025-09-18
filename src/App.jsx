// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { FaFilePdf, FaIdCard, FaPlusCircle, FaBook, FaUsers, FaChartLine } from 'react-icons/fa';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import ClientForm from './pages/ClientForm';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';

import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import AdminUpload from './pages/AdminUpload';
import AdminReports from './pages/AdminReports';
import ClientDashboard from './pages/ClientDashboard';

import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/DashboardLayout';
import { useAuth } from './context/AuthContext';
import './index.css';

// --- Menus ---
const clientMenus = [
  { href: '/client', label: 'Overview', icon: FaUsers },
  { href: '/client/pdf', label: 'PDF Form', icon: FaFilePdf },
  { href: '/client/generate', label: 'Generate ID', icon: FaPlusCircle },
  { href: '/client/idcards', label: 'Your ID Cards', icon: FaIdCard },
  { href: '/client/publications', label: 'Publications', icon: FaBook },
];

const adminMenus = [
  { href: '/admin', label: 'Dashboard', icon: FaChartLine },
  { href: '/admin/upload', label: 'Upload Data', icon: FaPlusCircle },
  { href: '/admin/reports', label: 'Reports', icon: FaChartLine },
  { href: '/admin/users', label: 'Users', icon: FaUsers },
];

const superMenus = [
  { href: '/superadmin', label: 'Users', icon: FaUsers },
  { href: '/superadmin/reports', label: 'All Reports', icon: FaChartLine },
];

export default function App() {
  const { user, loading } = useAuth();

  // --- Global loading spinner ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/client-form" element={<ClientForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Protected Routes */}

          {/* Super Admin */}
          <Route element={<PrivateRoute role="SUPERADMIN" />}>
            <Route
              element={<DashboardLayout user={user} menus={superMenus} />}
            >
              <Route path="/superadmin" element={<ManagerDashboard />} />
              <Route path="/superadmin/reports" element={<ManagerDashboard />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<PrivateRoute role="ADMIN" />}>
            <Route
              element={<DashboardLayout user={user} menus={adminMenus} />}
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/upload" element={<AdminUpload />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/users" element={<UserManagement />} />
            </Route>
          </Route>

          {/* Client */}
          <Route element={<PrivateRoute role="CLIENT" />}>
            <Route
              element={<DashboardLayout user={user} menus={clientMenus} />}
            >
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/pdf" element={<ClientDashboard />} />
              <Route path="/client/generate" element={<ClientDashboard />} />
              <Route path="/client/idcards" element={<ClientDashboard />} />
              <Route path="/client/publications" element={<ClientDashboard />} />
            </Route>
          </Route>

          {/* Catch-all → Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}
