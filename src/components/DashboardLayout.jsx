// src/components/DashboardLayout.jsx
import React, { createContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FaBars, FaTimes, FaKey } from 'react-icons/fa';
import Swal from 'sweetalert2';
import ChangePasswordPage from '../pages/ChangePassword';

// Context to allow children to open change password modal
export const ChangePwModalContext = createContext(null);

const avatarColors = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#6366F1'];

function getAvatarBg(name='') {
  if (!name) return avatarColors[0];
  const code = name.trim().charCodeAt(0);
  return avatarColors[code % avatarColors.length];
}

function getFirstName(fullName='') {
  return fullName.trim().split(/\s+/)[0] || 'User';
}

export default function DashboardLayout({ children, menus = [], user }) {
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
      title: 'Are you sure?',
      text: 'You will be logged out!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2b31e1ff',
      confirmButtonText: 'Yes, logout',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('fibuca_user');
        localStorage.removeItem('fibuca_token');
        Swal.fire({
          icon: 'success',
          title: 'Logged Out',
          text: 'You have been successfully logged out.',
          timer: 1500,
          showConfirmButton: false,
        });
        navigate('/login');
      }
    });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <ChangePwModalContext.Provider value={setShowChangePwModal}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className={`fixed md:relative z-40 md:z-20 top-0 left-0 h-screen md:h-auto w-64 bg-[#d5d7d7] shadow-md transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-300 md:block">
            <h2 className="text-lg font-bold text-blue-600">FIBUCA Portal</h2>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}><FaTimes size={22} /></button>
          </div>
          <nav className="p-4 space-y-2">
            {menus.map((menu, idx) => (
              <button
                key={idx}
                onClick={() => { navigate(menu.href); setSidebarOpen(false); }}
                className={`flex items-center gap-2 w-full text-left px-4 py-2 rounded-md transition-all duration-200 ${isActive(menu.href) ? 'bg-white text-blue-700 font-semibold shadow' : 'text-gray-800 hover:bg-[#c2c4c5]'}`}
              >
                {menu.icon && <menu.icon size={16} />}
                {menu.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="bg-blue-700 text-white flex items-center justify-between px-4 py-4 shadow-md md:px-6 relative z-30">
            <div className="flex items-center gap-2">
              <button className="md:hidden" onClick={() => setSidebarOpen(true)}><FaBars size={24} /></button>
              <span className="text-xl font-bold">FIBUCA</span>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button className="flex items-center gap-2 focus:outline-none" onClick={() => setDropdownOpen(prev => !prev)}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: getAvatarBg(user?.name) }}>
                  {user?.name?.trim()?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline">{getFirstName(user?.name)}</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-700 text-black dark:text-white rounded-md shadow-lg z-40">
                  <button
                    onClick={() => { setShowChangePwModal(true); setDropdownOpen(false); }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    <FaKey /> Change Password
                  </button>
                  <div className="px-4 py-2">
                    <button onClick={handleLogout} className="flex items-center bg-red-600 hover:bg-red-700 text-white text-center py-2 px-4 rounded font-semibold shadow transition">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 overflow-y-auto">
            {children || <Outlet />}
          </main>
        </div>

        {/* Change Password Modal */}
        {showChangePwModal && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-30"
              onClick={() => setShowChangePwModal(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-40">
              <div className="relative w-full max-w-md">
                <button
                  className="absolute top-0 right-0 m-2 text-white text-lg font-bold"
                  onClick={() => setShowChangePwModal(false)}
                >
                  ✕
                </button>
                <ChangePasswordPage
                  inModal={true}
                  onSuccess={() => setShowChangePwModal(false)}
                  onCancel={() => setShowChangePwModal(false)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </ChangePwModalContext.Provider>
  );
}
