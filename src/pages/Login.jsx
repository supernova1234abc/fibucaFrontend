// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api }               from '../lib/api'      // ← add this
import axios from 'axios'
import { FaSpinner } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext';
export default function Login() {
    const { setUser } = useAuth();
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
    
     const res = await api.post('/api/login', {
        employeeNumber: form.username,
        password: form.password,
      })

      const { user, token } = res.data
      const fibucaUser = {
        id: user.id,
        username: user.employeeNumber,
        role: user.role,
        name: user.name,
        passwordChanged: !user.firstLogin,
        pdfPath: user.pdfPath || null,
      }

     // localStorage.setItem('fibuca_user', JSON.stringify(fibucaUser))
      localStorage.setItem('fibuca_user', JSON.stringify(fibucaUser));
    setUser(fibucaUser);

      if (!fibucaUser.passwordChanged) {
        navigate('/change-password')
      } else {
        navigate(`/${fibucaUser.role.toLowerCase()}`)
      }
    } catch (err) {
      console.error('Login error:', err)
      alert('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <div className="flex justify-center mb-4">
          <img
            src="/images/newFibucaLogo.png"
            alt="Fibuca Logo"
            className="h-28 w-28 opacity-90"
          />
        </div>

        <hr className="mb-6" />

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-700">FIBUCA</h2>
          <Link to="/" className="text-xl font-bold text-blue-500 hover:underline">
            ← Home
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              placeholder="Enter your employee number"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block text-gray-700 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="text-right mb-4">
            <Link
              to="/forgot-password"
              className="text-blue-600 text-sm hover:underline"
            >
              Forgot password?
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
                Logging in…
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Default password:{' '}
          <span className="text-blue-700 font-medium">
            will be provided Once
          </span>
          <br />
          You must change it after login.
        </p>
      </div>
    </div>
  )
}
