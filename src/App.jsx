// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import ClientForm from './pages/ClientForm';
import ScanPaperForm from './pages/ScanPaperForm';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import SubmissionValidator from './pages/SubmissionValidator';

import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminReports from './pages/AdminReports';
import ClientDashboard from './pages/ClientDashboard';
import StaffDashboard from './pages/staffDashboard';
import AdminIdCards from './pages/AdminIdCards';

import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/DashboardLayout';
import LoadingIntro from './components/LoadingIntro';
import { useAuth } from './context/AuthContext';
import './index.css';

// --- Menus ---
const clientMenus = [
  { href: '/client', label: 'Overview' },
  { href: '/client/pdf', label: 'PDF Form' },
  { href: '/client/generate', label: 'Generate ID' },
  { href: '/client/idcards', label: 'Your ID Cards' },
  { href: '/client/support', label: 'Support' },
];

const adminMenus = [
  { href: '/admin/submissions', label: 'Dashboard' },
  { href: '/admin/scan-paper', label: 'Scan Paper' },
  { href: '/admin/idcards', label: 'ID Cards' },
  { href: '/admin/reports', label: 'Reports' },
];

const staffMenus = [
  { href: '/staff/links', label: 'Dashboard' },
  { href: '/staff/scan-paper', label: 'Scan paper form' },
];

const superMenus = [
  { href: '/superadmin', label: 'Users' },
  { href: '/superadmin/reports', label: 'All Reports' },
];

export default function App() {
  const { user, loading } = useAuth();
  const isLandingRoute = typeof window !== 'undefined' && window.location.pathname === '/';
  const [introFinished, setIntroFinished] = useState(!isLandingRoute);

  useEffect(() => {
    if (!isLandingRoute) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setIntroFinished(true);
    }, 4000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isLandingRoute]);

  const showLandingIntro = isLandingRoute && (!introFinished || loading);

  if (showLandingIntro) {
    return <LoadingIntro hold={introFinished && loading} />;
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/submission/:token" element={<SubmissionValidator />} />
          <Route path="/client-form/:token" element={<ClientForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Super Admin */}
          <Route element={<PrivateRoute role="SUPERADMIN" />}>
            <Route element={<DashboardLayout user={user} menus={superMenus} />}>
              <Route path="/superadmin" element={<ManagerDashboard />} />
              <Route path="/superadmin/reports" element={<ManagerDashboard />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<PrivateRoute role="ADMIN" />}>
            <Route element={<DashboardLayout user={user} menus={adminMenus} />}>
              <Route path="/admin" element={<Navigate to="/admin/submissions" replace />} />
              <Route path="/admin/submissions" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminDashboard />} />
              <Route path="/admin/leaderboard" element={<AdminDashboard />} />
              <Route path="/admin/idcards" element={<AdminIdCards />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/scan-paper" element={<ScanPaperForm />} />
            </Route>
          </Route>

          {/* Staff */}
          <Route element={<PrivateRoute role="STAFF" />}>
            <Route element={<DashboardLayout user={user} menus={staffMenus} />}>
              <Route path="/staff" element={<Navigate to="/staff/links" replace />} />
              <Route path="/staff/links" element={<StaffDashboard />} />
              <Route path="/staff/clients" element={<StaffDashboard />} />
              <Route path="/staff/profile" element={<StaffDashboard />} />
              <Route path="/staff/scan-paper" element={<ScanPaperForm />} />
              <Route path="/staff/complaints" element={<StaffDashboard />} />
            </Route>
          </Route>

          {/* Client */}
          <Route element={<PrivateRoute role="CLIENT" />}>
            <Route element={<DashboardLayout user={user} menus={clientMenus} />}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/pdf" element={<ClientDashboard />} />
              <Route path="/client/generate" element={<ClientDashboard />} />
              <Route path="/client/idcards" element={<ClientDashboard />} />
              <Route path="/client/support" element={<ClientDashboard />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}