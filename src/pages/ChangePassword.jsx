// src/pages/ChangePassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Reusable Password Form Component
function PasswordForm({
  oldPassword,
  newPassword,
  confirmPassword,
  showOld,
  showNew,
  showConfirm,
  setOldPassword,
  setNewPassword,
  setConfirmPassword,
  toggleShowOld,
  toggleShowNew,
  toggleShowConfirm,
  onSave,
  onCancel,
  loading,
  inModal,
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 shadow-md rounded p-6 w-full max-w-md ${
        inModal ? '' : 'mx-auto'
      }`}
    >
      <h2
        className={`text-xl font-bold mb-4 flex justify-center ${
          inModal ? 'text-gray-800 dark:text-white' : 'text-blue-700'
        }`}
      >
        Change Password
      </h2>

      {/* OLD PASSWORD */}
      <div className="relative mb-4">
        <input
          type={showOld ? 'text' : 'password'}
          placeholder="Current Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full p-2 border rounded pr-10"
          disabled={loading}
        />
        <button
          type="button"
          onClick={toggleShowOld}
          className="absolute inset-y-0 right-2 flex items-center text-gray-500"
        >
          {showOld ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      {/* NEW PASSWORD */}
      <div className="relative mb-4">
        <input
          type={showNew ? 'text' : 'password'}
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-2 border rounded pr-10"
          disabled={loading}
        />
        <button
          type="button"
          onClick={toggleShowNew}
          className="absolute inset-y-0 right-2 flex items-center text-gray-500"
        >
          {showNew ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      {/* CONFIRM NEW PASSWORD */}
      <div className="relative mb-6">
        <input
          type={showConfirm ? 'text' : 'password'}
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-2 border rounded pr-10"
          disabled={loading}
        />
        <button
          type="button"
          onClick={toggleShowConfirm}
          className="absolute inset-y-0 right-2 flex items-center text-gray-500"
        >
          {showConfirm ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {inModal && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// Main ChangePassword Page/Modal
export default function ChangePassword({ inModal = false, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      inModal ? onCancel?.() : navigate('/login');
    }
  }, [user, inModal, navigate, onCancel]);

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      return alert('All fields are required.');
    }
    if (newPassword !== confirmPassword) {
      return alert('New password and confirmation do not match.');
    }

    try {
      setLoading(true);
      await api.put('/api/change-password', {
        employeeNumber: user.username,
        oldPassword,
        newPassword,
      });

      // Refresh user state to mark password as changed
      await refreshUser();

      inModal ? onSuccess?.() : navigate(`/${user.role.toLowerCase()}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return inModal ? (
    <PasswordForm
      oldPassword={oldPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      showOld={showOld}
      showNew={showNew}
      showConfirm={showConfirm}
      setOldPassword={setOldPassword}
      setNewPassword={setNewPassword}
      setConfirmPassword={setConfirmPassword}
      toggleShowOld={() => setShowOld((v) => !v)}
      toggleShowNew={() => setShowNew((v) => !v)}
      toggleShowConfirm={() => setShowConfirm((v) => !v)}
      onSave={handleChangePassword}
      onCancel={onCancel}
      loading={loading}
      inModal={inModal}
    />
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <PasswordForm
        oldPassword={oldPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        showOld={showOld}
        showNew={showNew}
        showConfirm={showConfirm}
        setOldPassword={setOldPassword}
        setNewPassword={setNewPassword}
        setConfirmPassword={setConfirmPassword}
        toggleShowOld={() => setShowOld((v) => !v)}
        toggleShowNew={() => setShowNew((v) => !v)}
        toggleShowConfirm={() => setShowConfirm((v) => !v)}
        onSave={handleChangePassword}
        onCancel={onCancel}
        loading={loading}
        inModal={inModal}
      />
    </div>
  );
}
