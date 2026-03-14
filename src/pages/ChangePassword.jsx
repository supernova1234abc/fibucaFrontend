import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function PasswordInput({ value, onChange, placeholder, shown, onToggle, disabled }) {
  return (
    <div className="relative mb-4">
      <input
        type={shown ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full p-2 border rounded pr-10"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-2 flex items-center text-gray-500"
      >
        {shown ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
}

export default function ChangePassword({ inModal = false, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [channel, setChannel] = useState('EMAIL');
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [otpTarget, setOtpTarget] = useState('');
  const [loading, setLoading] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isFirstLoginFlow = !!user && user.passwordChanged === false;

  useEffect(() => {
    if (!user) {
      inModal ? onCancel?.() : navigate('/login');
    }
  }, [user, inModal, navigate, onCancel]);

  const handleRequestFirstLoginOtp = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/auth/request-first-login-otp', { channel });
      setOtpSent(true);
      setOtpTarget(res?.data?.target || 'your contact');
      setOtpHint(res?.data?.devOtp ? `Dev OTP: ${res.data.devOtp}` : '');
      alert(`OTP sent via ${channel}${res?.data?.target ? ` to ${res.data.target}` : ''}.`);
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to request OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      return alert('New password and confirmation are required.');
    }

    if (newPassword !== confirmPassword) {
      return alert('New password and confirmation do not match.');
    }

    if (newPassword.length < 6) {
      return alert('Password must be at least 6 characters.');
    }

    try {
      setLoading(true);

      if (isFirstLoginFlow) {
        if (!otp.trim()) {
          return alert('OTP code is required for first login.');
        }

        await api.post('/api/auth/complete-first-login', {
          otp: otp.trim(),
          newPassword,
        });
      } else {
        if (!oldPassword.trim()) {
          return alert('Current password is required.');
        }

        await api.put('/api/change-password', {
          employeeNumber: user.username,
          oldPassword,
          newPassword,
        });
      }

      await refreshUser();
      if (inModal) {
        onSuccess?.();
      } else {
        navigate(`/${user.role.toLowerCase()}`);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className={inModal ? '' : 'min-h-screen flex items-center justify-center bg-blue-50 p-4'}>
      <div className={`bg-white shadow-md rounded p-6 w-full max-w-md ${inModal ? '' : 'mx-auto'}`}>
        <h2 className={`text-xl font-bold mb-4 text-center ${isFirstLoginFlow ? 'text-blue-700' : 'text-gray-800'}`}>
          {isFirstLoginFlow ? 'First Login Setup' : 'Change Password'}
        </h2>

        {isFirstLoginFlow ? (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">OTP Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={loading || otpSent}
              >
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleRequestFirstLoginOtp}
              disabled={loading}
              className="w-full mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            {otpTarget && (
              <p className="text-xs text-gray-600 mb-3">OTP target: {otpTarget}</p>
            )}

            {otpHint && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
                {otpHint}
              </p>
            )}

            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter OTP code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={loading}
              />
            </div>
          </>
        ) : (
          <PasswordInput
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Current Password"
            shown={showOld}
            onToggle={() => setShowOld((v) => !v)}
            disabled={loading}
          />
        )}

        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New Password"
          shown={showNew}
          onToggle={() => setShowNew((v) => !v)}
          disabled={loading}
        />

        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm New Password"
          shown={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          disabled={loading}
        />

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
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
