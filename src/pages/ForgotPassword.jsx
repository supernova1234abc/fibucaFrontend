import { useState } from 'react';
import Swal from 'sweetalert2';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPassword() {
  const { isSw } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState('EMAIL');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState('request');
  const [loading, setLoading] = useState(false);
  const [otpHint, setOtpHint] = useState('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      return Swal.fire(isSw ? 'Samahani!' : 'Oops!', isSw ? 'Namba ya mwajiriwa, jina la mtumiaji au barua pepe inahitajika.' : 'Employee number, username, or email is required.', 'warning');
    }

    try {
      setLoading(true);
      const res = await api.post('/api/auth/request-otp', {
        identifier: identifier.trim(),
        purpose: 'FORGOT_PASSWORD',
        channel,
      });

      const target = res?.data?.target || 'your contact';
      const devOtp = res?.data?.devOtp;

      setOtpHint(devOtp ? `Dev OTP: ${devOtp}` : '');
      setStage('reset');
      await Swal.fire(isSw ? 'OTP Imetumwa' : 'OTP Sent', isSw ? `Nambari imetumwa kwa ${channel} kwenda ${target}.` : `Code sent via ${channel} to ${target}.`, 'success');
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error || (isSw ? 'Imeshindikana kutuma OTP.' : 'Failed to send OTP.');
      const title = status === 404 ? (isSw ? 'Akaunti haijapatikana' : 'Account Not Found') : (isSw ? 'Hitilafu' : 'Error');
      await Swal.fire(title, message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      return Swal.fire(isSw ? 'Samahani!' : 'Oops!', isSw ? 'Jaza sehemu zote.' : 'All fields are required.', 'warning');
    }

    if (newPassword !== confirmPassword) {
      return Swal.fire(isSw ? 'Samahani!' : 'Oops!', isSw ? 'Nywila mpya na uthibitisho havilingani.' : 'New password and confirmation do not match.', 'warning');
    }

    if (newPassword.length < 6) {
      return Swal.fire(isSw ? 'Samahani!' : 'Oops!', isSw ? 'Nywila lazima iwe na angalau herufi 6.' : 'Password must be at least 6 characters.', 'warning');
    }

    try {
      setLoading(true);
      await api.post('/api/auth/reset-password-with-otp', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });

      await Swal.fire(isSw ? 'Imefanikiwa' : 'Success', isSw ? 'Kubadili nywila kumefanikiwa. Tafadhali ingia.' : 'Password reset successful. Please login.', 'success');
      setStage('request');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpHint('');
    } catch (err) {
      await Swal.fire(isSw ? 'Hitilafu' : 'Error', err?.response?.data?.error || (isSw ? 'Imeshindikana kubadili nywila.' : 'Failed to reset password.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={stage === 'request' ? handleRequestOtp : handleResetPassword}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isSw ? 'Umesahau Nywila' : 'Forgot Password'}
        </h2>

        <div className="mb-4">
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
            {isSw ? 'Namba ya Mwajiriwa / Jina la Mtumiaji / Barua Pepe' : 'Employee Number / Username / Email'}
          </label>
          <input
            id="identifier"
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={isSw ? 'mf. EMP001 au wewe@example.com' : 'e.g. EMP001 or you@example.com'}
            disabled={loading || stage === 'reset'}
          />
        </div>

        {stage === 'request' && (
          <div className="mb-4">
            <label htmlFor="channel" className="block text-sm font-medium text-gray-700">
              {isSw ? 'Tuma OTP kupitia' : 'Send OTP via'}
            </label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="EMAIL">{isSw ? 'Barua pepe' : 'Email'}</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
        )}

        {stage === 'reset' && (
          <>
            <div className="mb-4">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                {isSw ? 'Nambari ya OTP' : 'OTP Code'}
              </label>
              <input
                id="otp"
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={isSw ? 'Weka nambari ya tarakimu 6' : 'Enter 6-digit code'}
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                {isSw ? 'Nywila Mpya' : 'New Password'}
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={isSw ? 'Angalau herufi 6' : 'At least 6 characters'}
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {isSw ? 'Thibitisha Nywila' : 'Confirm Password'}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={isSw ? 'Rudia nywila mpya' : 'Re-enter new password'}
                disabled={loading}
              />
            </div>
          </>
        )}

        {otpHint && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
            {otpHint}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading
            ? (isSw ? 'Subiri...' : 'Please wait...')
            : stage === 'request'
            ? (isSw ? 'Tuma OTP' : 'Send OTP')
            : (isSw ? 'Badili Nywila' : 'Reset Password')}
        </button>

        {stage === 'reset' && (
          <button
            type="button"
            onClick={() => {
              setStage('request');
              setOtp('');
              setNewPassword('');
              setConfirmPassword('');
            }}
            disabled={loading}
            className="w-full mt-3 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition disabled:opacity-50"
          >
            {isSw ? 'Rudi' : 'Back'}
          </button>
        )}
      </form>
    </div>
  );
}
