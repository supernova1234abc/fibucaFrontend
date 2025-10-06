// src/pages/UserManagement.jsx
import { useEffect, useState } from 'react'
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { api } from '../lib/api' // your Axios instance

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal & form state
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    username: '',
    email: '',
    role: 'CLIENT',
    employeeNumber: '',
    password: ''
  })
  const [isEditing, setIsEditing] = useState(false)

  // -------------------- FETCH USERS --------------------
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/users')
      setUsers(res.data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // -------------------- OPEN/CLOSE MODAL --------------------
  const openModal = (user = null) => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeNumber: user.employeeNumber,
        password: ''
      })
      setIsEditing(true)
    } else {
      setFormData({
        id: null,
        name: '',
        username: '',
        email: '',
        role: 'CLIENT',
        employeeNumber: '',
        password: ''
      })
      setIsEditing(false)
    }
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  // -------------------- HANDLE FORM CHANGE --------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // -------------------- CREATE / UPDATE USER --------------------
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isEditing) {
        // Update user
        const res = await api.put(`/api/admin/users/${formData.id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          employeeNumber: formData.employeeNumber
        })
        setUsers(users.map(u => (u.id === formData.id ? res.data : u)))
        Swal.fire('Updated!', 'User updated successfully', 'success')
      } else {
        // Create user
        const res = await api.post('/api/admin/users', formData)
        setUsers([res.data, ...users])
        Swal.fire('Created!', 'User created successfully', 'success')
      }
      closeModal()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', err.response?.data?.error || 'Failed to save user', 'error')
    }
  }

  // -------------------- DELETE USER --------------------
  const deleteUser = (id) => {
    Swal.fire({
      title: 'Confirm Delete?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/api/admin/users/${id}`)
          setUsers(users.filter(u => u.id !== id))
          Swal.fire('Deleted!', 'User deleted successfully', 'success')
        } catch (err) {
          console.error(err)
          Swal.fire('Error', 'Failed to delete user', 'error')
        }
      }
    })
  }

  // -------------------- RENDER --------------------
  if (loading) return <div>Loading users…</div>
  if (!users.length) return <div>No users found.</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <FaPlus /> Add User
        </button>
      </div>

      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Name</th>
            <th className="p-2">Username</th>
            <th className="p-2">Email</th>
            <th className="p-2">Role</th>
            <th className="p-2">Employee #</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.username}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{u.employeeNumber}</td>
              <td className="p-2 space-x-2">
                <button onClick={() => openModal(u)} className="text-blue-600">
                  <FaEdit />
                </button>
                <button onClick={() => deleteUser(u.id)} className="text-red-600">
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* -------------------- MODAL -------------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              {!isEditing && (
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                />
              )}
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
              <input
                type="text"
                name="employeeNumber"
                placeholder="Employee Number"
                value={formData.employeeNumber}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              {!isEditing && (
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                />
              )}
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              >
                <option value="CLIENT">CLIENT</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  {isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
