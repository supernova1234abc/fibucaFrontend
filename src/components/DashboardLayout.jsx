// src/components/DashboardLayout.jsx
import React, { createContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FaBars, FaTimes, FaKey, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import Swal from 'sweetalert2';
import ChangePasswordPage from '../pages/ChangePassword';

export const ChangePwModalContext = createContext(null);

const avatarColors = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#6366F1'];

function getAvatarBg(name='') {
  if (!name) return avatarColors[0];
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

function getInitial(name='') {
  return name?.trim()?.[0]?.toUpperCase() || 'U';
}

function getFirstName(name='') {
  return name.split(' ')[0] || 'User';
}

export default function DashboardLayout({ menus = [], user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout?',
      text: 'You will be logged out',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Logout',
    }).then((res) => {
      if (res.isConfirmed) {
        localStorage.removeItem('fibuca_user');
        localStorage.removeItem('fibuca_token');
        navigate('/login');
      }
    });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <ChangePwModalContext.Provider value={setShowChangePwModal}>
      <div className="min-h-screen bg-gray-50 flex">

        {/* SIDEBAR */}
        <aside className={`fixed md:relative z-40 w-64 h-screen bg-[#d5d7d7] transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}>
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-bold text-blue-600">FIBUCA Portal</h2>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <nav className="p-4 space-y-2">
            {menus.map((menu, i) => (
              <button
                key={i}
                onClick={() => { navigate(menu.href); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-md transition ${
                  isActive(menu.href)
                    ? 'bg-white text-blue-700 shadow font-semibold'
                    : 'hover:bg-gray-200'
                }`}
              >
                {menu.icon && <menu.icon size={16} />}
                {menu.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col">

          {/* HEADER */}
          <header className="bg-blue-700 text-white flex items-center justify-between px-4 py-4 shadow-md">
            <div className="flex items-center gap-2">
              <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
                <FaBars size={22} />
              </button>
              <span className="font-bold text-lg">FIBUCA</span>
            </div>

            {/* PROFILE */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(p => !p)}
                className="flex items-center gap-2 focus:outline-none"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: getAvatarBg(user?.name) }}
                >
                  {getInitial(user?.name)}
                </div>
                <span className="hidden md:inline">
                  {getFirstName(user?.name)}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl z-50 overflow-hidden">

                  {/* PROFILE CARD */}
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: getAvatarBg(user?.name) }}
                      >
                        {getInitial(user?.name)}
                      </div>
                      <div>
                        <p className="font-semibold">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 font-medium">{user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="py-2">
                    <button
                      className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100"
                      onClick={() => {
                        setShowChangePwModal(true);
                        setDropdownOpen(false);
                      }}
                    >
                      <FaKey /> Change Password
                    </button>

                    <button
                      className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* CONTENT */}
          <main className="flex-1 p-4 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {/* CHANGE PASSWORD MODAL */}
        {showChangePwModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowChangePwModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <ChangePasswordPage
                inModal
                onSuccess={() => setShowChangePwModal(false)}
                onCancel={() => setShowChangePwModal(false)}
              />
            </div>
          </>
        )}
      </div>
    </ChangePwModalContext.Provider>
  );
}
