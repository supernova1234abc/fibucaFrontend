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
  FaCamera,
} from "react-icons/fa";
import Swal from "sweetalert2";
import ChangePasswordPage from "../pages/ChangePassword";
import BottomNavbar from "./BottomNavbar";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

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
  const { user: authUser, setUser, refreshUser } = useAuth();
  const { isSw } = useLanguage();
  const activeUser = authUser || user;
  const isSuperadmin = activeUser?.role === "SUPERADMIN";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePhone2, setProfilePhone2] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [sectionMenus, setSectionMenus] = useState([]);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [avatarPhotoError, setAvatarPhotoError] = useState(false);
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(Date.now());
  const dropdownRef = useRef(null);

  useEffect(() => {
    setAvatarPhotoError(false);
    setAvatarCacheBuster(Date.now());
  }, [authUser?.profilePhotoUrl]);

  useEffect(() => {
    if (!showProfileModal) return;
    setProfileEmail(activeUser?.email || "");
    setProfilePhone(activeUser?.phone || "");
    setProfilePhone2(activeUser?.phone2 || "");
    setProfilePhotoFile(null);
    if (profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
      setProfilePhotoPreview("");
    }
    setProfileEditMode(false);
  }, [showProfileModal, activeUser]);

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
    };
  }, [profilePhotoPreview]);

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await api.put("/api/profile", {
        email: profileEmail,
        phone: profilePhone,
        phone2: profilePhone2,
      });
      await refreshUser();
      setProfileEditMode(false);
      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your profile details were saved successfully.",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err?.response?.data?.error || "Failed to update profile",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadProfilePhoto = async () => {
    if (!profilePhotoFile) return;
    try {
      setUploadingProfilePhoto(true);
      const formData = new FormData();
      formData.append("photo", profilePhotoFile);
      const res = await api.put("/api/profile/photo", formData);
      const updatedUser = res.data?.user;
      if (updatedUser) {
        setUser({ ...updatedUser, passwordChanged: !updatedUser.firstLogin });
        const storage = localStorage.getItem("fibuca_token")
          ? localStorage
          : sessionStorage.getItem("fibuca_token")
          ? sessionStorage
          : null;
        if (storage) storage.setItem("fibuca_user", JSON.stringify(updatedUser));
      }
      await refreshUser().catch(() => {});
      setAvatarPhotoError(false);
      setAvatarCacheBuster(Date.now());
      setProfilePhotoFile(null);
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
        setProfilePhotoPreview("");
      }
      Swal.fire({
        icon: "success",
        title: isSw ? "Picha Imesasishwa" : "Photo Updated",
        text: isSw ? "Picha ya wasifu imehifadhiwa." : "Your profile photo was updated.",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: isSw ? "Imeshindikana" : "Upload Failed",
        text: err?.response?.data?.error || (isSw ? "Imeshindikana kupakia picha" : "Failed to upload photo"),
      });
    } finally {
      setUploadingProfilePhoto(false);
    }
  };

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
      title: isSw ? "Una uhakika?" : "Are you sure?",
      text: isSw ? "Utatolewa kwenye mfumo!" : "You will be logged out!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#2563eb",
      confirmButtonText: isSw ? "Ndio, toka" : "Yes, logout",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("fibuca_user");
        localStorage.removeItem("fibuca_token");
        sessionStorage.removeItem("fibuca_user");
        sessionStorage.removeItem("fibuca_token");

        Swal.fire({
          icon: "success",
          title: isSw ? "Umetoka" : "Logged Out",
          text: isSw ? "Umetoka kwenye mfumo kwa mafanikio." : "You have been successfully logged out.",
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

      const parentActiveClass = isSuperadmin
        ? "bg-black text-emerald-300 font-semibold shadow-md border border-slate-700"
        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md";

      const parentIdleClass = isSuperadmin
        ? "text-slate-100 hover:bg-slate-700/70"
        : "text-blue-900 hover:bg-blue-200/60";

      const childActiveClass = isSuperadmin
        ? "bg-black text-emerald-300 font-semibold border border-slate-700"
        : "bg-blue-100 text-blue-700 font-semibold";

      const childIdleClass = isSuperadmin
        ? "text-slate-300 hover:bg-slate-700/60"
        : "text-blue-800 hover:bg-blue-200/50";

      return (
        <div key={key} className="space-y-1">
          <button
            onClick={() => {
              const menuKey = menu.id || menu.label || idx;
              setExpandedMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
            }}
            className={`no-force-dark group flex items-center justify-between w-full text-left rounded-xl transition-all duration-200 px-4 py-3 text-sm ${
              activeParent ? parentActiveClass : parentIdleClass
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
                        ? childActiveClass
                        : childIdleClass
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

    const activeClass = isSuperadmin
      ? "bg-black text-emerald-300 font-semibold shadow-md border border-slate-700"
      : type === "section"
        ? "bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold shadow-md"
        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md";

    const idleClass = isSuperadmin
      ? "text-slate-100 hover:bg-slate-700/70"
      : "text-blue-900 hover:bg-blue-200/60";

    const idleIconClass = isSuperadmin
      ? "text-emerald-400 group-hover:text-emerald-300"
      : "text-blue-600 group-hover:text-blue-800";

    const btn = (
      <button
        onClick={() => {
          navigate(menu.href);
          setSidebarOpen(false);
        }}
        className={`no-force-dark group flex items-center w-full text-left rounded-xl transition-all duration-200 px-4 py-3 text-sm ${
          active ? activeClass : idleClass
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <span className={active ? (isSuperadmin ? "text-emerald-300" : "text-white") : idleIconClass}>
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

        <div className={`min-h-screen flex flex-col md:flex-row ${isSuperadmin ? "bg-black" : "bg-slate-50"}`}>
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={`no-force-dark fixed md:relative z-40 md:z-20 top-0 left-0 h-screen md:h-auto w-72
              ${isSuperadmin ? "bg-slate-800 border-r border-slate-700" : "bg-gradient-to-br from-blue-100 via-white to-blue-50 border-r border-blue-200"} shadow-xl md:shadow-none transition-transform transform
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
          >
            <div className={`flex items-center justify-between px-5 py-5 ${isSuperadmin ? "border-b border-slate-700" : "border-b border-blue-200"}`}>
              <div>
                <h2 className={`text-xl font-extrabold tracking-tight ${isSuperadmin ? "text-white" : "text-blue-900"}`}>FIBUCA</h2>
                <p className={`mt-1 text-xs ${isSuperadmin ? "text-emerald-400" : "text-blue-700"}`}>Portal Dashboard</p>
              </div>

              <button
                className={`md:hidden no-force-dark p-2 rounded-lg border ${isSuperadmin ? "bg-black border-slate-700 text-emerald-300 hover:bg-slate-900" : "bg-blue-500 border-blue-500 text-white hover:bg-blue-600"} transition-colors`}
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                title="Close menu"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <nav className="p-4 space-y-4">
              <div>
                <div className={`px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] ${isSuperadmin ? "text-emerald-400" : "text-blue-800"}`}>
                  Main Menu
                </div>
                <div className="space-y-2">
                  {menus.map((menu, idx) => renderMenuButton(menu, idx, "main"))}
                </div>
              </div>

              {sectionMenus.length > 0 && (
                <div className="hidden md:block">
                  <div className={`px-2 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] ${isSuperadmin ? "text-emerald-400 border-t border-slate-700" : "text-blue-800 border-t border-blue-200"}`}>
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
            <header className={`no-force-dark flex items-center justify-between px-4 py-4 md:px-6 sticky top-0 z-30 ${isSuperadmin ? "bg-black border-b border-slate-800" : "bg-white border-b border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <button
                  className={`md:hidden no-force-dark p-2 rounded-lg border ${isSuperadmin ? "bg-slate-900 border-slate-700 text-emerald-300" : "bg-blue-500 border-blue-500 text-white hover:bg-blue-600"}`}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  <FaBars size={18} />
                </button>

                <div>
                  <h1 className={`text-lg md:text-xl font-bold ${isSuperadmin ? "text-white" : "text-slate-800"}`}>{isSw ? "Dashibodi ya FIBUCA" : "FIBUCA Dashboard"}</h1>
                  <p className={`hidden md:block text-xs ${isSuperadmin ? "text-emerald-400/80" : "text-slate-500"}`}>
                    {isSw ? "Karibu tena," : "Welcome back,"} {getFirstName(activeUser?.name)}
                  </p>
                </div>
              </div>

              <div className="relative flex items-center gap-2" ref={dropdownRef}>
                <LanguageSwitcher compact />
                <button
                  className={`flex items-center gap-3 focus:outline-none no-force-dark rounded-xl px-2 py-1.5 transition ${isSuperadmin ? "hover:bg-slate-900" : "hover:bg-slate-100"}`}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  {authUser?.profilePhotoUrl && !avatarPhotoError ? (
                    <img
                      src={`${authUser.profilePhotoUrl}${authUser.profilePhotoUrl.includes("?") ? "&" : "?"}v=${avatarCacheBuster}`}
                      alt={activeUser?.name || 'User'}
                      className="w-9 h-9 rounded-full object-cover shadow-sm"
                      onError={() => setAvatarPhotoError(true)}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: getAvatarBg(activeUser?.name) }}
                    >
                      {activeUser?.name?.trim()?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <div className={`text-sm font-semibold ${isSuperadmin ? "text-white" : "text-slate-800"}`}>
                      {getFirstName(activeUser?.name)}
                    </div>
                    <div className={`text-[11px] uppercase tracking-wide ${isSuperadmin ? "text-emerald-400/80" : "text-slate-500"}`}>
                      {activeUser?.role || "USER"}
                    </div>
                  </div>
                </button>

                {dropdownOpen && (
                  <div className={`absolute right-0 mt-2 w-60 rounded-2xl shadow-xl z-[80] overflow-hidden ${isSuperadmin ? "bg-slate-900 text-white border border-slate-700" : "bg-white text-slate-900 border border-slate-200"}`}>
                    <div className={`px-4 py-4 ${isSuperadmin ? "border-b border-slate-700" : "border-b border-slate-100"}`}>
                      <div className="text-sm font-semibold">{activeUser?.name || "User"}</div>
                      <div className={`mt-1 text-xs uppercase tracking-wide ${isSuperadmin ? "text-emerald-400/80" : "text-slate-500"}`}>
                        {activeUser?.role || "USER"}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setDropdownOpen(false);
                      }}
                      className={`no-force-dark flex items-center gap-3 w-full text-left px-4 py-3 transition ${isSuperadmin ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}
                    >
                      <FaUser className={isSuperadmin ? "text-emerald-400" : "text-slate-500"} />
                      <span>{isSw ? "Wasifu Wangu" : "My Profile"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowChangePwModal(true);
                        setDropdownOpen(false);
                      }}
                      className={`no-force-dark flex items-center gap-3 w-full text-left px-4 py-3 transition ${isSuperadmin ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}
                    >
                      <FaKey className={isSuperadmin ? "text-emerald-400" : "text-slate-500"} />
                      <span>{isSw ? "Badili Nenosiri" : "Change Password"}</span>
                    </button>

                    <div className={`p-3 ${isSuperadmin ? "border-t border-slate-700" : "border-t border-slate-100"}`}>
                      <button
                        onClick={handleLogout}
                        className={`no-force-dark flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold shadow-sm w-full transition ${isSuperadmin ? "bg-black hover:bg-slate-950 text-emerald-300 border border-slate-700" : "bg-red-600 hover:bg-red-700 text-white"}`}
                      >
                        <FaSignOutAlt />
                        {isSw ? "Toka" : "Logout"}
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
                    <h3 className="text-lg font-bold text-slate-800">{isSw ? "Wasifu Wangu" : "My Profile"}</h3>
                    <button
                      className="text-slate-500 hover:text-slate-700"
                      onClick={() => setShowProfileModal(false)}
                      aria-label="Close profile modal"
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>

                  <div className="px-5 py-4 space-y-3 text-sm">
                    <div className="flex items-center gap-4 pb-1">
                      <label className="relative cursor-pointer">
                        {(profilePhotoPreview || authUser?.profilePhotoUrl) ? (
                          <img
                            src={profilePhotoPreview || `${authUser?.profilePhotoUrl}${authUser?.profilePhotoUrl?.includes("?") ? "&" : "?"}v=${avatarCacheBuster}`}
                            alt={activeUser?.name || "User"}
                            className="h-20 w-20 rounded-full object-cover border-2 border-slate-200"
                          />
                        ) : (
                          <div
                            className="h-20 w-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                            style={{ backgroundColor: getAvatarBg(activeUser?.name) }}
                          >
                            {activeUser?.name?.trim()?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-2 text-white shadow">
                          <FaCamera className="text-xs" />
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setProfilePhotoFile(file);
                            if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
                            setProfilePhotoPreview(file ? URL.createObjectURL(file) : "");
                          }}
                        />
                      </label>

                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">{isSw ? "Picha ya wasifu" : "Profile photo"}</p>
                        <button
                          onClick={handleUploadProfilePhoto}
                          disabled={!profilePhotoFile || uploadingProfilePhoto}
                          className="inline-flex items-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                        >
                          <FaCamera />
                          {uploadingProfilePhoto
                            ? (isSw ? "Inapakia picha..." : "Uploading photo...")
                            : (isSw ? "Sasisha Picha" : "Update Photo")}
                        </button>
                      </div>
                    </div>

                    <p><span className="font-semibold text-slate-700">{isSw ? "Jina:" : "Name:"}</span> {activeUser?.name || "-"}</p>
                    <p><span className="font-semibold text-slate-700">{isSw ? "Wajibu:" : "Role:"}</span> {activeUser?.role || "-"}</p>
                    <p><span className="font-semibold text-slate-700">{isSw ? "Jina la Mtumiaji:" : "Username:"}</span> {activeUser?.username || "-"}</p>
                    <p><span className="font-semibold text-slate-700">{isSw ? "Namba ya Mtumishi:" : "Employee #:"}</span> {activeUser?.employeeNumber || "-"}</p>
                    {profileEditMode ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">{isSw ? "Barua Pepe" : "Email"}</label>
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2"
                            placeholder="your@email.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">{isSw ? "Simu" : "Phone"}</label>
                          <input
                            type="tel"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2"
                            placeholder="+255..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">{isSw ? "Simu ya Pili" : "Second Phone"}</label>
                          <input
                            type="tel"
                            value={profilePhone2}
                            onChange={(e) => setProfilePhone2(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2"
                            placeholder="+255..."
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p><span className="font-semibold text-slate-700">{isSw ? "Barua Pepe:" : "Email:"}</span> {user?.email || "-"}</p>
                        <p><span className="font-semibold text-slate-700">{isSw ? "Simu:" : "Phone:"}</span> {user?.phone || "-"}</p>
                        <p><span className="font-semibold text-slate-700">{isSw ? "Simu ya Pili:" : "Second Phone:"}</span> {user?.phone2 || "-"}</p>
                      </>
                    )}
                  </div>

                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    {profileEditMode ? (
                      <>
                        <button
                          onClick={() => {
                            setProfileEditMode(false);
                            setProfileEmail(user?.email || "");
                            setProfilePhone(user?.phone || "");
                            setProfilePhone2(user?.phone2 || "");
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700"
                          disabled={savingProfile}
                        >
                          {isSw ? "Ghairi" : "Cancel"}
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:bg-slate-400"
                          disabled={savingProfile}
                        >
                          {savingProfile ? (isSw ? "Inahifadhi..." : "Saving...") : (isSw ? "Hifadhi Mabadiliko" : "Save Changes")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setProfileEditMode(true)}
                        className="px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                      >
                        {isSw ? "Hariri Wasifu" : "Edit Profile"}
                      </button>
                    )}
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