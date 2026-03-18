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

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => isActive(tab.href, tab.exact))
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-10px_24px_rgba(2,6,23,0.14)] z-40">
      <div className="relative grid h-20 max-w-7xl mx-auto" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        <div className="pointer-events-none absolute inset-0 px-1 pt-2 pb-1">
          <div
            className="h-full rounded-2xl transition-transform duration-300 ease-out"
            style={{
              width: `${100 / tabs.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          >
            <div className="mx-1 h-full rounded-xl bg-gradient-to-b from-red-100 to-red-50 border border-red-200/80 shadow-[0_4px_12px_rgba(220,38,38,0.15)]" />
          </div>
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.exact);

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.href)}
              className={`relative z-10 flex flex-col items-center justify-center h-20 transition-all duration-300 ${
                active ? "text-red-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                  active
                    ? "-translate-y-1 bg-white shadow-[0_6px_16px_rgba(220,38,38,0.22)]"
                    : "bg-transparent"
                }`}
              >
                {Icon ? <Icon size={20} /> : null}
              </div>
              <span className={`text-[10px] font-semibold text-center px-1 mt-1 transition-all duration-300 ${active ? "-translate-y-0.5" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}