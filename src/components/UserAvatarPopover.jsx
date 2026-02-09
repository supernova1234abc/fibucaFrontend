// src/components/UserAvatarPopover.jsx
import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function UserAvatarPopover({ user }) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative inline-block">
      {/* Avatar */}
      <img
        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
        alt={user.name}
        className="w-12 h-12 rounded-full border-2 border-blue-500 cursor-pointer"
        onClick={() => setOpen(!open)}
      />

      {/* Popover */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-md border z-50 p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg">Profile</h3>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-800">
              <FaTimes />
            </button>
          </div>
          <div className="space-y-1">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Employee #:</strong> {user.employeeNumber || 'N/A'}</p>
            <p><strong>Company:</strong> {user.company || 'N/A'}</p>
            <p><strong>Role:</strong> {user.role || 'N/A'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
