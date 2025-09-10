// src/pages/AdminUpload.jsx
import { useState } from 'react'
import axios from 'axios'
import { api }               from '../lib/api'      // ← add this

import { FaUpload } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function AdminUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      return toast.error('Please select a file first.')
    }

    const formData = new FormData()
    formData.append('bulkFile', file)

    try {
      setLoading(true)
      const { data } = await api.post(
        '/api/admin/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      toast.success(data.message || 'File uploaded successfully!')
      setFile(null)
    } catch (err) {
      console.error(err)
      toast.error(
        err.response?.data?.message ||
          'Upload failed. Please check the file and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Bulk Upload</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">
            Select CSV/Excel file
          </label>
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {file && (
          <p className="text-sm text-gray-600">
            Selected: <span className="font-semibold">{file.name}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          <FaUpload />
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
