import { useEffect, useState } from 'react';
import { api, setAuthToken } from '../lib/api';
import DataTable from 'react-data-table-component';
import {
  FaDownload,
  FaFilePdf,
  FaEdit,
  FaTrash,
  FaUpload
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || 'https://fibucabackend.onrender.com';

  useEffect(() => {
    const user =
      JSON.parse(localStorage.getItem('fibuca_user')) ||
      JSON.parse(sessionStorage.getItem('fibuca_user'));
    const token =
      localStorage.getItem('fibuca_token') ||
      sessionStorage.getItem('fibuca_token');

    if (!user || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }

    if (token) setAuthToken(token);
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    api.get('/submissions')
      .then(res => {
        setUsers(res.data);
        setFilteredUsers(res.data);
      })
      .catch(console.error);
  };

  /* =======================
     TABLE COLUMNS (RESPONSIVE)
     ======================= */

  const columns = [
    {
      name: 'SN',
      selector: (row, index) => index + 1,
      width: '60px',
    },
    {
      name: 'Name',
      selector: row => row.employeeName,
      sortable: true,
      wrap: true,
      minWidth: '160px',
    },
    {
      name: 'Number',
      selector: row => row.employeeNumber,
      minWidth: '140px',
    },
    {
      name: 'Employer',
      selector: row => row.employerName,
      minWidth: '180px',
      hide: 'sm', // 🔥 HIDE ON MOBILE
    },
    {
      name: 'Dues',
      selector: row => row.dues,
      width: '90px',
      hide: 'sm',
    },
    {
      name: 'Submitted',
      selector: row => new Date(row.submittedAt).toLocaleString(),
      minWidth: '200px',
      hide: 'md', // hide on small + medium
    },
    {
      name: 'PDF',
      cell: row => {
        if (!row.pdfPath) return <span className="text-gray-400">No File</span>;
        const isFullUrl = /^https?:/i.test(row.pdfPath);
        const pdfUrl = isFullUrl
          ? row.pdfPath
          : `${BACKEND_URL}/${row.pdfPath.replace(/^\/?uploads\//, 'uploads/')}`;

        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            <FaFilePdf className="inline mr-1" />
            PDF
          </a>
        );
      },
      width: '90px',
    },
    {
      name: 'Actions',
      cell: row => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="bg-yellow-500 text-white px-2 py-1 rounded"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="bg-red-500 text-white px-2 py-1 rounded"
          >
            <FaTrash />
          </button>
        </div>
      ),
      width: '120px',
    },
  ];

  /* =======================
     SEARCH
     ======================= */
  const handleSearch = value => {
    if (!value) return setFilteredUsers(users);
    setFilteredUsers(
      users.filter(u =>
        [u.employeeName, u.employeeNumber, u.employerName]
          .join(' ')
          .toLowerCase()
          .includes(value.toLowerCase())
      )
    );
  };

  /* =======================
     EDIT / DELETE
     ======================= */
  const handleEdit = user => {
    setEditingUser(user);
    setEditForm({
      employeeName: user.employeeName,
      employeeNumber: user.employeeNumber,
      employerName: user.employerName,
      dues: user.dues,
      witness: user.witness,
    });
  };

  const handleDelete = id => {
    Swal.fire({
      title: 'Delete?',
      text: 'This record will be removed permanently',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(res => {
      if (res.isConfirmed) {
        api.delete(`/submissions/${id}`).then(fetchUsers);
      }
    });
  };

  const handleUpdate = () => {
    api.put(`/submissions/${editingUser.id}`, editForm)
      .then(() => {
        setEditingUser(null);
        fetchUsers();
      })
      .catch(console.error);
  };

  /* =======================
     UI
     ======================= */

  return (
    <div className="flex flex-col gap-4 p-4">

      <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
        FIBUCA Submissions
      </h1>

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
            <FaUpload className="inline mr-2" />
            {uploading ? 'Uploading...' : 'Upload Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              disabled={uploading}
            />
          </label>

          <button className="bg-green-600 text-white px-4 py-2 rounded">
            <FaDownload className="inline mr-2" />
            Excel
          </button>

          <button className="bg-red-600 text-white px-4 py-2 rounded">
            <FaFilePdf className="inline mr-2" />
            PDF
          </button>
        </div>

        <input
          type="text"
          placeholder="Search..."
          className="border rounded px-3 py-2 w-full md:w-64"
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* TABLE WRAPPER — THIS FIXES MOBILE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <div className="min-w-[900px]"> {/* 🔥 CRITICAL */}
          <DataTable
            columns={columns}
            data={filteredUsers}
            pagination
            highlightOnHover
            striped
            responsive
            fixedHeader
            fixedHeaderScrollHeight="60vh"
          />
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="font-bold mb-4">Edit Submission</h2>

            {Object.keys(editForm).map(field => (
              <input
                key={field}
                className="w-full border p-2 rounded mb-3"
                value={editForm[field]}
                onChange={e =>
                  setEditForm({ ...editForm, [field]: e.target.value })
                }
              />
            ))}

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingUser(null)}>Cancel</button>
              <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
