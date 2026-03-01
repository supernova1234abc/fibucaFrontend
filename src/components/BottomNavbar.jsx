// src/components/BottomNavbar.jsx
import React from 'react';
import { FaFileAlt, FaUsers, FaTrophy, FaCog, FaHome } from 'react-icons/fa';

export default function BottomNavbar({ activeTab, onTabChange, tabs = [] }) {
  // Default tabs if not provided
  const defaultTabs = [
    { id: 'submissions', label: 'Submissions', icon: FaFileAlt },
    { id: 'users', label: 'Users', icon: FaUsers },
    { id: 'leaderboard', label: 'Leaderboard', icon: FaTrophy }
  ];

  const tabList = tabs.length > 0 ? tabs : defaultTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40">
      <div className="flex justify-around items-center h-20 max-w-7xl mx-auto">
        {tabList.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-20 transition-all duration-200 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 border-t-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon
                size={24}
                className={isActive ? 'mb-1' : 'mb-1'}
              />
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
