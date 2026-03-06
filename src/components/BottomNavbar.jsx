// src/components/BottomNavbar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaFileAlt, FaUsers, FaTrophy } from "react-icons/fa";

export default function BottomNavbar({ tabs = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  const defaultTabs = [
    { id: "submissions", label: "Submissions", icon: FaFileAlt, href: "/admin/submissions" },
    { id: "users", label: "Users", icon: FaUsers, href: "/admin/users" },
    { id: "leaderboard", label: "Leaderboard", icon: FaTrophy, href: "/admin/leaderboard" }
  ];

  const tabList = tabs.length > 0 ? tabs : defaultTabs;

  const isActive = (href) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="flex justify-around items-center h-20 max-w-7xl mx-auto">
        {tabList.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.href)}
              className={`flex flex-col items-center justify-center flex-1 h-20 transition-all duration-200 ${
                active
                  ? "text-blue-600 border-t-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon size={24} className="mb-1" />
              <span className="text-[10px] font-semibold text-center px-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}