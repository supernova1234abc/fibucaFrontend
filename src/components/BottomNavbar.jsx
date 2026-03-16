// src/components/BottomNavbar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNavbar({ tabs = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!tabs || tabs.length === 0) return null;

  const isActive = (href, exact = false) =>
    exact
      ? location.pathname === href
      : location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] z-40">
      <div className="flex justify-around items-center h-20 max-w-7xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.exact);

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.href)}
              className={`flex flex-col items-center justify-center flex-1 h-20 transition-all duration-200 ${
                active
                  ? "text-red-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition ${
                  active ? "bg-red-100 shadow-sm" : "bg-transparent"
                }`}
              >
                {Icon ? <Icon size={20} /> : null}
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