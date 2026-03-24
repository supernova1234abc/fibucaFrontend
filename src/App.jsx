// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FaHome, FaFilePdf, FaIdCard, FaShieldAlt, FaUsers, FaHistory, FaVoteYea } from 'react-icons/fa';

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
import AdminVoting from './pages/AdminVoting';
import ClientDashboard from './pages/ClientDashboard';
import StaffDashboard from './pages/staffDashboard';
import VotingPage from './pages/VotingPage';
import AdminIdCards from './pages/AdminIdCards';

import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/DashboardLayout';
import LoadingIntro from './components/LoadingIntro';
import RouteBackArrow from './components/RouteBackArrow';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import './index.css';

export default function App() {
  const { user, loading } = useAuth();
  const { isSw } = useLanguage();
  const isLandingRoute = typeof window !== 'undefined' && window.location.pathname === '/';
  const [introFinished, setIntroFinished] = useState(!isLandingRoute);

  const clientMenus = [
    { id: 'overview', href: '/client', label: isSw ? 'Muhtasari' : 'Overview', exact: true, bottomNav: true, icon: FaHome },
    { id: 'pdf', href: '/client/pdf', label: 'PDF', bottomNav: true, icon: FaFilePdf },
    { id: 'idcards', href: '/client/idcards', label: isSw ? 'Kitambulisho' : 'ID Card', bottomNav: true, icon: FaIdCard },
    { id: 'generate', href: '/client/generate', label: isSw ? 'Tengeneza ID' : 'Generate ID' },
    { id: 'documents', href: '/client/documents', label: isSw ? 'Nyaraka' : 'Documents' },
    { id: 'updates', href: '/client/updates', label: isSw ? 'Habari na Taarifa' : 'News & Updates' },
    {
      id: 'support',
      label: isSw ? 'Msaada' : 'Support',
      children: [
        { id: 'support-complaints', href: '/client/support/complaints', label: isSw ? 'Malalamiko' : 'Complaints' },
        { id: 'support-transfer', href: '/client/support/transfer', label: isSw ? 'Taarifa ya Uhamisho' : 'Transfer Notice' },
      ],
    },
  ];

  const adminMenus = [
    { href: '/admin/submissions', label: isSw ? 'Dashibodi' : 'Dashboard' },
    { href: '/admin/scan-paper', label: isSw ? 'Skani Fomu' : 'Scan Paper' },
    { href: '/admin/idcards', label: isSw ? 'Vitambulisho' : 'ID Cards' },
    { href: '/admin/reports', label: isSw ? 'Ripoti' : 'Reports' },
    { href: '/admin/voting', label: isSw ? 'Kura' : 'Voting', icon: FaVoteYea },
  ];

  const staffMenus = [
    { href: '/staff/links', label: isSw ? 'Dashibodi' : 'Dashboard', exact: true },
    { href: '/staff/notices', label: isSw ? 'Matangazo' : 'Notices' },
    { href: '/staff/scan-paper', label: isSw ? 'Fomu ya skani' : 'Scan paper form' },
    { href: '/staff/voting', label: isSw ? 'Piga Kura' : 'Vote', icon: FaVoteYea },
  ];

  const superMenus = [
    { href: '/superadmin', label: isSw ? 'Amri Kuu' : 'Control Center', exact: true, icon: FaShieldAlt },
    { href: '/superadmin/security', label: isSw ? 'Ulinzi Hai' : 'Live Security', icon: FaShieldAlt },
    { href: '/superadmin/users', label: isSw ? 'Watumiaji' : 'Users', icon: FaUsers },
    { href: '/superadmin/audit', label: isSw ? 'Ukaguzi' : 'Audit', icon: FaHistory },
    { href: '/superadmin/voting', label: isSw ? 'Kura' : 'Voting', icon: FaVoteYea },
  ];

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
        <RouteBackArrow />
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
              <Route path="/superadmin/security" element={<ManagerDashboard />} />
              <Route path="/superadmin/users" element={<ManagerDashboard />} />
              <Route path="/superadmin/audit" element={<ManagerDashboard />} />
              <Route path="/superadmin/reports" element={<ManagerDashboard />} />
              <Route path="/superadmin/voting" element={<AdminVoting />} />
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
              <Route path="/admin/voting" element={<AdminVoting />} />
            </Route>
          </Route>

          {/* Staff */}
          <Route element={<PrivateRoute role="STAFF" />}>
            <Route element={<DashboardLayout user={user} menus={staffMenus} />}>
              <Route path="/staff" element={<Navigate to="/staff/links" replace />} />
              <Route path="/staff/links" element={<StaffDashboard />} />
              <Route path="/staff/clients" element={<StaffDashboard />} />
              <Route path="/staff/profile" element={<StaffDashboard />} />
              <Route path="/staff/notices" element={<StaffDashboard />} />
              <Route path="/staff/scan-paper" element={<ScanPaperForm />} />
              <Route path="/staff/complaints" element={<StaffDashboard />} />
              <Route path="/staff/voting" element={<VotingPage />} />
            </Route>
          </Route>

          {/* Client */}
          <Route element={<PrivateRoute role="CLIENT" />}>
            <Route element={<DashboardLayout user={user} menus={clientMenus} />}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/pdf" element={<ClientDashboard />} />
              <Route path="/client/generate" element={<ClientDashboard />} />
              <Route path="/client/idcards" element={<ClientDashboard />} />
              <Route path="/client/documents" element={<ClientDashboard />} />
              <Route path="/client/updates" element={<ClientDashboard />} />
              <Route path="/client/support" element={<Navigate to="/client/support/complaints" replace />} />
              <Route path="/client/support/complaints" element={<ClientDashboard />} />
              <Route path="/client/support/transfer" element={<ClientDashboard />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}