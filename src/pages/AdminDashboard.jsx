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
    import.meta.env.VITE_BACKEND_URL ||
    'https://fibucabackend.onrender.com';

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

  const handleSearch = (value) => {
    if (!value) return setFilteredUsers(users);

    setFilteredUsers(
      users.filter(u =>
        [u.employeeName, u.employeeNumber, u.employerName]
          .some(v => v?.toLowerCase().includes(value.toLowerCase()))
      )
    );
  };

  const columns = [
    { name: 'SN', selector: (_, i) => i + 1, width: '60px' },
    { name: 'Name', selector: r => r.employeeName, wrap: true },
    { name: 'Number', selector: r => r.employeeNumber },
    { name: 'Employer', selector: r => r.employerName, wrap: true },
    { name: 'Dues', selector: r => r.dues },
    {
      name: 'Submitted',
      selector: r => new Date(r.submittedAt).toLocaleString(),
      wrap: true
    },
    {
      name: 'PDF',
      cell: (row) => {
        if (!row.pdfPath)
          return <span className="text-gray-400">No File</span>;

        const isFullUrl = row.pdfPath.startsWith('http');
        const pdfUrl = isFullUrl
          ? row.pdfPath
          : `${BACKEND_URL}/${row.pdfPath.replace(/^\/?uploads\//, 'uploads/')}`;

        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            <FaFilePdf className="inline mr-1" /> View
          </a>
        );
      }
    },
    {
      name: 'Actions',
      cell: row => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingUser(row)}
            className="bg-yellow-500 text-white p-2 rounded"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="bg-red-600 text-white p-2 rounded"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Delete record?',
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true
    }).then(res => {
      if (res.isConfirmed) {
        api.delete(`/submissions/${id}`).then(fetchUsers);
      }
    });
  };

  return (
    <div className="p-4 w-full max-w-full overflow-hidden">
      <h1 className="text-3xl font-bold text-blue-700 mb-4">
        FIBUCA Submissions
      </h1>

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row gap-3 justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
            <FaUpload className="inline mr-2" />
            {uploading ? 'Uploading...' : 'Upload Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
            />
          </label>
        </div>

        <input
          placeholder="Search..."
          onChange={(e) => handleSearch(e.target.value)}
          className="border p-2 rounded w-full md:w-64"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-hidden w-full">
        <DataTable
          columns={columns}
          data={filteredUsers}
          pagination
          fixedHeader
          fixedHeaderScrollHeight="60vh"
          highlightOnHover
          striped
        />
      </div>
    </div>
  );
}
