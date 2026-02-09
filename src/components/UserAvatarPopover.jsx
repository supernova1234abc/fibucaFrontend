import React, { useState, useRef, useEffect } from 'react';
import { FaKey, FaSignOutAlt } from 'react-icons/fa';

const avatarColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'];

const getAvatarBg = (name = '') => {
  if (!name) return avatarColors[0];
  const code = name.trim().charCodeAt(0);
  return avatarColors[code % avatarColors.length];
};

const getInitials = (name = '') => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

export default function UserAvatarPopover({ user, onLogout, onChangePassword }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 focus:outline-none"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
          style={{ backgroundColor: getAvatarBg(user?.name) }}
        >
          {getInitials(user?.name)}
        </div>
        <span className="hidden md:inline">{user?.name?.split(' ')[0] || 'User'}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-700 text-black dark:text-white rounded-md shadow-lg z-50">
          
          {/* User Info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-600">
            <p className="font-semibold text-gray-800 dark:text-gray-200">{user?.name || 'Unknown User'}</p>
            {user?.email && <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>}
            {user?.role && <p className="text-xs text-gray-500 dark:text-gray-400">Role: {user.role}</p>}
            {user?.employeeNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400">ID: {user.employeeNumber}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col">
            <button
              onClick={() => { onChangePassword(); setOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <FaKey /> Change Password
            </button>
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600 dark:text-red-400"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
