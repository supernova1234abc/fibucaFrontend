// src/pages/AdminDashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api';
import DataTable from 'react-data-table-component';
import {
  FaDownload,
  FaFilePdf,
  FaEdit,
  FaTrash,
  FaUpload,
  FaSearch
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
  const [loading, setLoading] = useState(true);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL ||
    'https://fibuca-backend.vercel.app';

  /* ================= FETCH USERS ================= */
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
  }, [navigate]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get('/submissions')
      .then(res => {
        setUsers(res.data);
        setFilteredUsers(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  /* ================= SEARCH ================= */
  const handleSearch = value => {
    if (!value) return setFilteredUsers(users);

    const results = users.filter(u =>
      (u.employeeName || '').toLowerCase().includes(value.toLowerCase()) ||
      (u.employeeNumber || '').toLowerCase().includes(value.toLowerCase()) ||
      (u.employerName || '').toLowerCase().includes(value.toLowerCase())
    );

    setFilteredUsers(results);
  };

  /* ================= EXPORT ================= */
  const exportToExcel = () => {
    if (!filteredUsers.length)
      return Swal.fire('No Data', 'No records found.', 'info');

    const data = filteredUsers.map((user, index) => ({
      SN: index + 1,
      Name: user.employeeName,
      Number: user.employeeNumber,
      Employer: user.employerName,
      Dues: user.dues,
      Submitted: user.submittedAt
        ? new Date(user.submittedAt).toLocaleString()
        : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    XLSX.writeFile(workbook, 'fibuca_clients.xlsx');
  };

  const exportToPDF = () => {
    if (!filteredUsers.length)
      return Swal.fire('No Data', 'No records found.', 'info');

    const doc = new jsPDF();
    autoTable(doc, {
      head: [['SN', 'Name', 'Number', 'Employer', 'Dues', 'Submitted']],
      body: filteredUsers.map((user, index) => [
        index + 1,
        user.employeeName,
        user.employeeNumber,
        user.employerName,
        user.dues,
        user.submittedAt
          ? new Date(user.submittedAt).toLocaleString()
          : ''
      ])
    });
    doc.save('fibuca_clients.pdf');
  };

  /* ================= EDIT ================= */
  const handleEdit = user => {
    setEditingUser(user);
    setEditForm({
      employeeName: user.employeeName || '',
      employeeNumber: user.employeeNumber || '',
      employerName: user.employerName || '',
      dues: user.dues || '',
      witness: user.witness || ''
    });
  };

  const handleUpdate = () => {
    api.put(`/submissions/${editingUser.id}`, editForm)
      .then(() => {
        setEditingUser(null);
        fetchUsers();
        Swal.fire('Updated!', 'Record updated successfully.', 'success');
      })
      .catch(err => console.error(err));
  };

  const handleDelete = id => {
    Swal.fire({
      title: 'Delete this record?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48'
    }).then(result => {
      if (result.isConfirmed) {
        api.delete(`/submissions/${id}`)
          .then(() => {
            fetchUsers();
            Swal.fire('Deleted!', '', 'success');
          })
          .catch(err => console.error(err));
      }
    });
  };

  /* ================= EXCEL UPLOAD ================= */
  const handleUploadExcel = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet =
        workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json(worksheet);

      await api.post('/bulk-upload', { records });
      fetchUsers();

      Swal.fire('Success', 'Users uploaded!', 'success');
    } catch (err) {
      Swal.fire('Error', 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  /* ================= TABLE ================= */
  const columns = [
    {
      name: '#',
      selector: (row, index) => index + 1,
      width: '60px'
    },
    {
      name: 'Employee',
      selector: row => row.employeeName,
      sortable: true,
      wrap: true
    },
    {
      name: 'Number',
      selector: row => row.employeeNumber,
      wrap: true
    },
    {
      name: 'Employer',
      selector: row => row.employerName,
      wrap: true
    },
    {
      name: 'Dues',
      selector: row => row.dues
    },
    {
      name: 'PDF',
      cell: row => {
        if (!row.pdfPath)
          return <span className="text-gray-400">None</span>;

        const pdfUrl = row.pdfPath.startsWith('http')
          ? row.pdfPath
          : `${BACKEND_URL}/${row.pdfPath}`;

        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:underline"
          >
            <FaFilePdf />
          </a>
        );
      }
    },
    {
      name: 'Actions',
      cell: row => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  /* ================= STAFF LEADERBOARD ================= */
  const StaffLeaderboard = ({ users }) => {
    const ranked = [...users].sort((a, b) => (b.dues || 0) - (a.dues || 0)).slice(0, 10);
    return (
      <div className="bg-white rounded-xl shadow p-4 mt-6">
        <h2 className="text-xl font-bold mb-3">Staff Leaderboard</h2>
        <table className="w-full text-left table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Rank</th>
              <th className="p-2">Employee</th>
              <th className="p-2">Dues</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((u, index) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-2 font-bold">{index + 1}</td>
                <td className="p-2">{u.employeeName}</td>
                <td className="p-2">{u.dues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Admin Dashboard
          </h1>

          <div className="relative w-full md:w-72">
            <FaSearch className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition">
            <FaUpload className="inline mr-2" />
            {uploading ? 'Uploading...' : 'Upload Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleUploadExcel}
            />
          </label>

          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <FaDownload className="inline mr-2" />
            Excel
          </button>

          <button
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <FaFilePdf className="inline mr-2" />
            PDF
          </button>
        </div>

        {/* Table for Desktop */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6 hidden sm:block">
          <DataTable
            columns={columns}
            data={filteredUsers}
            pagination
            progressPending={loading}
            highlightOnHover
            responsive
            striped
          />
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden flex flex-col gap-4 mt-4">
          {filteredUsers.map(u => (
            <div key={u.id} className="bg-white p-4 rounded-lg shadow flex flex-col gap-2">
              <div className="font-bold">{u.employeeName}</div>
              <div className="text-gray-500">Number: {u.employeeNumber}</div>
              <div className="text-gray-500">Employer: {u.employerName}</div>
              <div className="text-gray-500">Dues: {u.dues}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleEdit(u)} className="text-blue-600"><FaEdit /></button>
                <button onClick={() => handleDelete(u.id)} className="text-red-600"><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Staff Leaderboard */}
        <StaffLeaderboard users={filteredUsers} />

      </div>

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              Edit User
            </h2>

            {Object.keys(editForm).map(field => (
              <div key={field} className="mb-3">
                <label className="block text-sm font-medium mb-1 capitalize">
                  {field}
                </label>
                <input
                  value={editForm[field]}
                  onChange={e =>
                    setEditForm({
                      ...editForm,
                      [field]: e.target.value
                    })
                  }
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}