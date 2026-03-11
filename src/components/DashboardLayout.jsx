// src/components/DashboardLayout.jsx
import React, { createContext, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaKey,
  FaSignOutAlt,
} from "react-icons/fa";
import Swal from "sweetalert2";
import ChangePasswordPage from "../pages/ChangePassword";

// Contexts
export const ChangePwModalContext = createContext(null);
export const DashboardSectionMenuContext = createContext(() => {});

const avatarColors = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6366F1",
];

const getAvatarBg = (name = "") => {
  if (!name) return avatarColors[0];
  const code = name.trim().charCodeAt(0);
  return avatarColors[code % avatarColors.length];
};

const getFirstName = (fullName = "") => fullName.trim().split(/\s+/)[0] || "User";

export default function DashboardLayout({ children, menus = [], user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [, setSectionMenus] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#2563eb",
      confirmButtonText: "Yes, logout",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("fibuca_user");
        localStorage.removeItem("fibuca_token");
        sessionStorage.removeItem("fibuca_user");
        sessionStorage.removeItem("fibuca_token");

        Swal.fire({
          icon: "success",
          title: "Logged Out",
          text: "You have been successfully logged out.",
          timer: 1500,
          showConfirmButton: false,
        });

        navigate("/login");
      }
    });
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const renderMenuButton = (menu, idx) => {
    const active = isActive(menu.href);
    const Icon = menu.icon;

    return (
      <button
        key={`${menu.href}-${idx}`}
        onClick={() => {
          navigate(menu.href);
          setSidebarOpen(false);
        }}
        className={`no-force-dark group flex items-center w-full text-left rounded-xl transition-all duration-200 px-4 py-3 text-sm ${
          active
            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <span className={active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}>
              <Icon size={16} />
            </span>
          )}
          <span>{menu.label}</span>
        </div>
      </button>
    );
  };

  return (
    <DashboardSectionMenuContext.Provider value={setSectionMenus}>
      <ChangePwModalContext.Provider value={setShowChangePwModal}>
        <style>{`
          :root { color-scheme: light; }
          .no-force-dark { forced-color-adjust: none; }
        `}</style>

        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={`no-force-dark fixed md:relative z-40 md:z-20 top-0 left-0 h-screen md:h-auto w-72
              bg-white border-r border-slate-200 shadow-xl md:shadow-none transition-transform transform
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-blue-700">FIBUCA</h2>
                <p className="text-xs text-slate-500 mt-1">Portal Dashboard</p>
              </div>

              <button
                className="md:hidden no-force-dark p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              <div className="mb-5">
                <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Main Menu
                </div>
                <div className="space-y-2">
                  {menus.map((menu, idx) => renderMenuButton(menu, idx))}
                </div>
              </div>
            </nav>
          </aside>

          <div className="flex-1 flex flex-col min-h-screen">
            <header className="no-force-dark bg-white border-b border-slate-200 flex items-center justify-between px-4 py-4 md:px-6 sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden no-force-dark p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  <FaBars size={18} />
                </button>

                <div>
                  <h1 className="text-lg md:text-xl font-bold text-slate-800">FIBUCA Dashboard</h1>
                  <p className="hidden md:block text-xs text-slate-500">
                    Welcome back, {getFirstName(user?.name)}
                  </p>
                </div>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  className="flex items-center gap-3 focus:outline-none no-force-dark rounded-xl px-2 py-1.5 hover:bg-slate-100 transition"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                    style={{ backgroundColor: getAvatarBg(user?.name) }}
                  >
                    {user?.name?.trim()?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-semibold text-slate-800">
                      {getFirstName(user?.name)}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      {user?.role || "USER"}
                    </div>
                  </div>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white text-slate-900 rounded-2xl shadow-xl z-40 border border-slate-200 overflow-hidden">
                    <div className="px-4 py-4 border-b border-slate-100">
                      <div className="text-sm font-semibold">{user?.name || "User"}</div>
                      <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">
                        {user?.role || "USER"}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowChangePwModal(true);
                        setDropdownOpen(false);
                      }}
                      className="no-force-dark flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                    >
                      <FaKey className="text-slate-500" />
                      <span>Change Password</span>
                    </button>

                    <div className="p-3 border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="no-force-dark flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl font-semibold shadow-sm w-full transition"
                      >
                        <FaSignOutAlt />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </header>

            <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-28 md:pb-6">
              {children || <Outlet />}
            </main>
          </div>

          {showChangePwModal && (
            <>
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                onClick={() => setShowChangePwModal(false)}
              />
              <div className="fixed inset-0 flex items-center justify-center z-40 p-4">
                <div className="relative w-full max-w-md">
                  <button
                    className="no-force-dark absolute top-0 right-0 m-2 bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center"
                    onClick={() => setShowChangePwModal(false)}
                    aria-label="Close modal"
                  >
                    ✕
                  </button>

                  <ChangePasswordPage
                    inModal
                    onSuccess={() => setShowChangePwModal(false)}
                    onCancel={() => setShowChangePwModal(false)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </ChangePwModalContext.Provider>
    </DashboardSectionMenuContext.Provider>
  );
}