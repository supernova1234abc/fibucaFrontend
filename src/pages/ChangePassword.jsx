// src/pages/ChangePassword.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import { api }               from '../lib/api'      // ← add this

import { useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

// 1) Move this out so it's not re‐declared each render
function PasswordForm({
  oldPassword, newPassword, confirmPassword,
  showOld, showNew, showConfirm,
  setOldPassword, setNewPassword, setConfirmPassword,
  toggleShowOld, toggleShowNew, toggleShowConfirm,
  onSave, onCancel, loading, inModal
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
  )
}

export default function ChangePassword({
  inModal = false,
  onSuccess,
  onCancel,
}) {
  const navigate = useNavigate()
  const [user, setUser]               = useState(null)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]         = useState(false)

  const [showOld, setShowOld]         = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('fibuca_user')
    if (!raw) {
      inModal ? onCancel?.() : navigate('/login')
    } else {
      setUser(JSON.parse(raw))
    }
  }, [inModal, navigate, onCancel])

  const handleChange = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      return alert('All fields are required.')
    }
    if (newPassword !== confirmPassword) {
      return alert('New password and confirmation do not match.')
    }

    try {
      setLoading(true)
      await api.put(
        '/api/change-password',
        {
          employeeNumber: user.username,
          oldPassword,
          newPassword,
        }
      )

      localStorage.setItem(
        'fibuca_user',
        JSON.stringify({ ...user, passwordChanged: true })
      )

      inModal ? onSuccess?.() : navigate(`/${user.role.toLowerCase()}`)
    } catch (err) {
      console.error(err)
      alert(
        err.response?.data?.message ||
          'Failed to change password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  // 2) Pass all needed props to our stable Form component
  const formProps = {
    oldPassword, newPassword, confirmPassword,
    showOld, showNew, showConfirm,
    setOldPassword, setNewPassword, setConfirmPassword,
    toggleShowOld: () => setShowOld((v) => !v),
    toggleShowNew: () => setShowNew((v) => !v),
    toggleShowConfirm: () => setShowConfirm((v) => !v),
    onSave: handleChange,
    onCancel,
    loading,
    inModal
  }

  // 3) Render either as a modal (inDashboard) or full‐page
  return inModal ? (
    <PasswordForm {...formProps} />
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <PasswordForm {...formProps} />
    </div>
  )
}
