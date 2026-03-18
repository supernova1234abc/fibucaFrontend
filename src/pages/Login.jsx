// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../lib/api';
import { FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import toast from 'react-hot-toast';

export default function Login() {
  const { setUser } = useAuth();
  const { isSw } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/api/login', {
        employeeNumber: form.username,
        password: form.password,
      });

      const { token, user } = res.data;
      if (!user) throw new Error('No user returned');

      const fibucaUser = {
        id: user.id,
        username: user.employeeNumber,
        role: user.role,
        name: user.name,
        passwordChanged: !user.firstLogin,
        pdfPath: user.pdfPath || null,
      };

      if (token) {
        setAuthToken(token);
        const storage = remember ? localStorage : sessionStorage;
        const otherStorage = remember ? sessionStorage : localStorage;

        // Enforce a single source of truth for auth persistence mode.
        otherStorage.removeItem('fibuca_token');
        otherStorage.removeItem('fibuca_user');
        storage.setItem('fibuca_token', token);
        storage.setItem('fibuca_user', JSON.stringify(fibucaUser));
      }

      setUser(fibucaUser);
      toast.success(isSw ? `Karibu tena, ${fibucaUser.name}` : `Welcome back, ${fibucaUser.name}`);

      if (!fibucaUser.passwordChanged) {
        navigate('/change-password');
      } else {
        navigate(`/${fibucaUser.role.toLowerCase()}`);
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error(isSw ? 'Namba ya mtumishi au nenosiri si sahihi.' : 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };
return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <div className="flex justify-end mb-3">
          <LanguageSwitcher compact />
        </div>
        <div className="flex justify-center mb-4">
          <img
            src="/images/logo-watermark.png"
            alt="Fibuca Logo"
            className="h-28 w-28 opacity-90"
          />
        </div>

        <hr className="mb-6" />

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-700">FIBUCA</h2>
          <span className="text-xs text-gray-400">&nbsp;</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-1">{isSw ? 'Namba ya Mtumishi' : 'Username'}</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              placeholder={isSw ? 'Weka namba yako ya mtumishi' : 'Enter your employee number'}
              required
            />
          </div>

          <div className="mb-2 relative">
            <label className="block text-gray-700 font-medium mb-1">{isSw ? 'Nenosiri' : 'Password'}</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              placeholder={isSw ? 'Weka nenosiri lako' : 'Enter your password'}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-9 right-3 text-gray-500 hover:text-blue-600"
              tabIndex={-1}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="accent-blue-600"
              />
              {isSw ? 'Nikumbuke' : 'Remember me'}
            </label>
            <Link to="/forgot-password" className="text-blue-600 text-sm hover:underline">
              {isSw ? 'Umesahau nenosiri?' : 'Forgot password?'}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                {isSw ? 'Inaingia...' : 'Logging in…'}
              </>
            ) : (
              isSw ? 'Ingia' : 'Login'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isSw ? 'Nenosiri la mwanzo:' : 'Default password:'}{' '}
          <span className="text-blue-700 font-medium">{isSw ? 'hutolewa mara moja' : 'will be provided Once'}</span>
          <br />
          {isSw ? 'Lazima ubadilishe baada ya kuingia.' : 'You must change it after login.'}
        </p>
      </div>
    </div>
  );
}
