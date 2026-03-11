// src/components/BottomNavbar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaFileAlt, FaUsers, FaTrophy, FaChartLine } from "react-icons/fa";

export default function BottomNavbar({ tabs = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  const defaultTabs = [
    { id: "submissions", label: "Submissions", icon: FaFileAlt, href: "/admin/submissions" },
    { id: "users", label: "Users", icon: FaUsers, href: "/admin/users" },
    { id: "leaderboard", label: "Leaderboard", icon: FaTrophy, href: "/admin/leaderboard" },
    { id: "reports", label: "Reports", icon: FaChartLine, href: "/admin/reports" },
  ];

  const tabList = tabs.length > 0 ? tabs : defaultTabs;

  const isActive = (href) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] z-40">
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
                  ? "text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition ${
                  active ? "bg-blue-100 shadow-sm" : "bg-transparent"
                }`}
              >
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-semibold text-center px-1 mt-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}