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
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://fibucabackend.onrender.com';

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
    api
      .get('/submissions') // no ngrok headers
      .then((res) => {
        setUsers(res.data);
        setFilteredUsers(res.data);
      })
      .catch((err) => console.error(err));
  };

  const exportToExcel = () => {
    const dataToExport = filteredUsers.map((user, index) => ({
      SN: index + 1,
      Name: user.employeeName,
      Number: user.employeeNumber,
      Employer: user.employerName,
      Dues: user.dues,
      'Submitted At': new Date(user.submittedAt).toLocaleString()
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    XLSX.writeFile(workbook, 'fibuca_clients.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['SN', 'Name', 'Number', 'Employer', 'Dues', 'Submitted At']],
      body: filteredUsers.map((user, index) => [
        index + 1,
        user.employeeName,
        user.employeeNumber,
        user.employerName,
        user.dues,
        new Date(user.submittedAt).toLocaleString()
      ])
    });
    doc.save('fibuca_clients.pdf');
  };

  const handleSearch = (value) => {
    if (!value) {
      setFilteredUsers(users);
    } else {
      const results = users.filter(
        (u) =>
          u.employeeName.toLowerCase().includes(value.toLowerCase()) ||
          u.employeeNumber.toLowerCase().includes(value.toLowerCase()) ||
          u.employerName.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredUsers(results);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      employeeName: user.employeeName,
      employeeNumber: user.employeeNumber,
      employerName: user.employerName,
      dues: user.dues,
      witness: user.witness
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This record will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        api
          .delete(`/submissions/${id}`)
          .then(() => fetchUsers())
          .catch((err) => console.error(err));
      }
    });
  };

  const handleUpdate = () => {
    api
      .put(`/submissions/${editingUser.id}`, editForm)
      .then(() => {
        setEditingUser(null);
        fetchUsers();
      })
      .catch((err) => console.error(err));
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(worksheet);

    try {
      await api.post('/bulk-upload', { records });
      fetchUsers();
      Swal.fire({
        icon: 'success',
        title: 'Upload Complete',
        text: 'Users uploaded successfully!',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: 'Something went wrong. Please check your file and try again.'
      });
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    { name: 'SN', selector: (row, index) => index + 1, width: '60px' },
    { name: 'Name', selector: (row) => row.employeeName, sortable: true },
    { name: 'Number', selector: (row) => row.employeeNumber },
    { name: 'Employer', selector: (row) => row.employerName },
    { name: 'Dues', selector: (row) => row.dues },
    { name: 'Submitted At', selector: (row) => new Date(row.submittedAt).toLocaleString() },
    {
      name: 'PDF',
      cell: (row) => {
        if (!row.pdfPath) return <span className="text-gray-400">No File</span>;
        // If it's a full Cloudinary URL, use directly; otherwise prepend BACKEND_URL
        const pdfUrl = row.pdfPath.startsWith('http') || row.pdfPath.startsWith('https')
          ? row.pdfPath
          : `${BACKEND_URL}/${row.pdfPath.replace(/^\/?uploads\//, 'uploads/')}`;
        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            <FaFilePdf className="inline mr-1" /> Download
          </a>
        );
      }
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-3xl font-bold text-blue-700">FIBUCA Submissions</h1>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <label className="bg-blue-600 text-white text-center py-2 px-4 rounded cursor-pointer hover:bg-blue-700">
            <FaUpload className="inline mr-2" />
            {uploading ? 'Uploading...' : 'Upload Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUploadExcel}
              className="hidden"
              disabled={uploading}
            />
          </label>

          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            <FaDownload className="inline mr-2" />
            Export Excel
          </button>

          <button
            onClick={exportToPDF}
            className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
          >
            <FaFilePdf className="inline mr-2" />
            Export PDF
          </button>
        </div>

        <input
          type="text"
          placeholder="Search..."
          className="p-2 border rounded w-full md:w-60"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow-md p-4 overflow-x-auto">
        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500">No submissions found.</p>
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            pagination
            highlightOnHover
            striped
            responsive
          />
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Submission</h2>
            {['employeeName', 'employeeNumber', 'employerName', 'dues', 'witness'].map((field) => (
              <div className="mb-3" key={field}>
                <label className="block text-sm font-medium capitalize">
                  {field.replace(/([A-Z])/g, ' $1')}
                </label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm[field] || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, [field]: e.target.value })
                  }
                />
              </div>
            ))}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
