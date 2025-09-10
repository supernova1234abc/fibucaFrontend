import { useEffect, useState } from 'react'
import axios from 'axios'
import { api } from '../lib/api'      // ← add this

import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa'
import Swal from 'sweetalert2'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  // …modal state, formData, etc…

  useEffect(() => {
    api.get('/api/admin/users')
      .then((res) => {
        console.log('GET /api/admin/users →', res.data)

        // Normalize to an array
        let list = []
        if (Array.isArray(res.data)) {
          list = res.data
        } else if (Array.isArray(res.data.users)) {
          list = res.data.users
        } else {
          console.warn(
            'Unexpected payload shape for /api/admin/users:',
            res.data
          )
        }

        setUsers(list)
      })
      .catch((err) => {
        console.error('Failed to fetch users:', err)
        setUsers([])
      })
      .finally(() => setLoading(false))
  }, [])

  // Render‐time guard
  if (loading) {
    return <div>Loading users…</div>
  }

  if (!Array.isArray(users) || users.length === 0) {
    return <div>No users found.</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        {/* Add button… */}
      </div>

      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Role</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
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

      {/* Modal code… */}
    </div>
  )
}
