// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FaFilePdf, FaIdCard, FaPlusCircle, FaBook, FaUsers, FaChartLine } from 'react-icons/fa';

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
import './index.css';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Menus
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

function App() {
  const { user: currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking session…
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

          {/* Superadmin Routes */}
          <Route
            path="/superadmin"
            element={
              <PrivateRoute role="SUPERADMIN">
                <DashboardLayout user={currentUser} menus={superMenus}>
                  <ManagerDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/superadmin/reports"
            element={
              <PrivateRoute role="SUPERADMIN">
                <DashboardLayout user={currentUser} menus={superMenus}>
                  <ManagerDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute role="ADMIN">
                <DashboardLayout user={currentUser} menus={adminMenus}>
                  <AdminDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/upload"
            element={
              <PrivateRoute role="ADMIN">
                <DashboardLayout user={currentUser} menus={adminMenus}>
                  <AdminUpload />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <PrivateRoute role="ADMIN">
                <DashboardLayout user={currentUser} menus={adminMenus}>
                  <AdminReports />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute role="ADMIN">
                <DashboardLayout user={currentUser} menus={adminMenus}>
                  <UserManagement />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Client Routes */}
          <Route
            path="/client"
            element={
              <PrivateRoute role="CLIENT">
                <DashboardLayout user={currentUser} menus={clientMenus}>
                  <ClientDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/client/pdf"
            element={
              <PrivateRoute role="CLIENT">
                <DashboardLayout user={currentUser} menus={clientMenus}>
                  <ClientDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/client/generate"
            element={
              <PrivateRoute role="CLIENT">
                <DashboardLayout user={currentUser} menus={clientMenus}>
                  <ClientDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/client/idcards"
            element={
              <PrivateRoute role="CLIENT">
                <DashboardLayout user={currentUser} menus={clientMenus}>
                  <ClientDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/client/publications"
            element={
              <PrivateRoute role="CLIENT">
                <DashboardLayout user={currentUser} menus={clientMenus}>
                  <ClientDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Catch-all → Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
