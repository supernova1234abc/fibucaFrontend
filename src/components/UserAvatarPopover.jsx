import React, { useState, useRef, useEffect } from 'react';
import { FaKey, FaSignOutAlt } from 'react-icons/fa';

export default function UserAvatarPopover({ user, onLogout, onChangePassword }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click or ESC
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const avatarBg = user?.name ? getAvatarBg(user.name) : '#6366F1';
  const firstLetter = user?.name?.trim()?.[0]?.toUpperCase() || 'U';

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 focus:outline-none"
        onClick={() => setOpen(prev => !prev)}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: avatarBg }}
        >
          {firstLetter}
        </div>
        <span className="hidden md:inline">{user?.name?.split(' ')[0] || 'User'}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-700 text-black dark:text-white rounded-md shadow-lg z-40">
          <button
            onClick={() => { onChangePassword?.(); setOpen(false); }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <FaKey /> Change Password
          </button>
          <div className="px-4 py-2">
            <button
              onClick={() => onLogout?.()}
              className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-semibold shadow w-full transition"
            >
              <FaSignOutAlt className="mr-1" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: avatar color
const avatarColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'];
function getAvatarBg(name = '') {
  if (!name) return avatarColors[0];
  const code = name.trim().charCodeAt(0);
  return avatarColors[code % avatarColors.length];
}
