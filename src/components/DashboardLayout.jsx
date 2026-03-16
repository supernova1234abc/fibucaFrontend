// src/components/DashboardLayout.jsx
import React, { createContext, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaKey,
  FaSignOutAlt,
  FaChevronDown,
  FaUser,
} from "react-icons/fa";
import Swal from "sweetalert2";
import ChangePasswordPage from "../pages/ChangePassword";
import BottomNavbar from "./BottomNavbar";

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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sectionMenus, setSectionMenus] = useState([]);
  const [expandedMenus, setExpandedMenus] = useState({});
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

  const bottomNavMenus = menus.filter((m) => m.bottomNav);

  const isAnyChildActive = (children = []) =>
    children.some((child) => isActive(child.href, child.exact));

  const isActive = (path, exact = false) =>
    exact
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const renderMenuButton = (menu, idx, type = "main") => {
    const hasChildren = Array.isArray(menu.children) && menu.children.length > 0;

    if (hasChildren) {
      const expanded = !!expandedMenus[menu.id || menu.label || idx];
      const activeParent = isAnyChildActive(menu.children);
      const key = `${menu.label}-${idx}`;

      return (
        <div key={key} className="space-y-1">
          <button
            onClick={() => {
              const menuKey = menu.id || menu.label || idx;
              setExpandedMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
            }}
            className={`no-force-dark group flex items-center justify-between w-full text-left rounded-xl transition-all duration-200 px-4 py-3 text-sm ${
              activeParent ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>{menu.label}</span>
            <FaChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} size={12} />
          </button>

          {expanded && (
            <div className="ml-3 space-y-1">
              {menu.children.map((child, childIdx) => {
                const childActive = isActive(child.href, child.exact);
                return (
                  <button
                    key={`${child.href}-${childIdx}`}
                    onClick={() => {
                      navigate(child.href);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                      childActive
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {child.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const active = isActive(menu.href, menu.exact);
    const Icon = menu.icon;
    const key = `${menu.href}-${idx}`;

    const activeClass =
      type === "section"
        ? "bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold shadow-md"
        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md";

    const btn = (
      <button
        onClick={() => {
          navigate(menu.href);
          setSidebarOpen(false);
        }}
        className={`no-force-dark group flex items-center w-full text-left rounded-xl transition-all duration-200 px-4 py-3 text-sm ${
          active ? activeClass : "text-slate-700 hover:bg-slate-100"
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

    // Items in the bottom nav are hidden on mobile sidebar (accessible via bottom bar)
    return (
      <div key={key} className={menu.bottomNav ? "hidden md:block" : ""}>
        {btn}
      </div>
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

            <nav className="p-4 space-y-4">
              <div>
                <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Main Menu
                </div>
                <div className="space-y-2">
                  {menus.map((menu, idx) => renderMenuButton(menu, idx, "main"))}
                </div>
              </div>

              {sectionMenus.length > 0 && (
                <div className="hidden md:block">
                  <div className="px-2 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 border-t border-slate-200">
                    Sections
                  </div>
                  <div className="space-y-2 mt-2">
                    {sectionMenus.map((menu, idx) => renderMenuButton(menu, idx, "section"))}
                  </div>
                </div>
              )}
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
                        setShowProfileModal(true);
                        setDropdownOpen(false);
                      }}
                      className="no-force-dark flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                    >
                      <FaUser className="text-slate-500" />
                      <span>My Profile</span>
                    </button>

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

            {bottomNavMenus.length > 0 && <BottomNavbar tabs={bottomNavMenus} />}
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

          {showProfileModal && (
            <>
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                onClick={() => setShowProfileModal(false)}
              />
              <div className="fixed inset-0 flex items-center justify-center z-40 p-4">
                <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">My Profile</h3>
                    <button
                      className="text-slate-500 hover:text-slate-700"
                      onClick={() => setShowProfileModal(false)}
                      aria-label="Close profile modal"
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>

                  <div className="px-5 py-4 space-y-3 text-sm">
                    <p><span className="font-semibold text-slate-700">Name:</span> {user?.name || "-"}</p>
                    <p><span className="font-semibold text-slate-700">Role:</span> {user?.role || "-"}</p>
                    <p><span className="font-semibold text-slate-700">Username:</span> {user?.username || "-"}</p>
                    <p><span className="font-semibold text-slate-700">Employee #:</span> {user?.employeeNumber || "-"}</p>
                    <p><span className="font-semibold text-slate-700">Email:</span> {user?.email || "-"}</p>
                    <p><span className="font-semibold text-slate-700">Phone:</span> {user?.phone || "-"}</p>
                    <p><span className="font-semibold text-slate-700">Second Phone:</span> {user?.phone2 || "-"}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ChangePwModalContext.Provider>
    </DashboardSectionMenuContext.Provider>
  );
}