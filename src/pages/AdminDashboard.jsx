// src/pages/AdminDashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api';
import DataTable from 'react-data-table-component';
import BottomNavbar from '../components/BottomNavbar';
import {
  FaDownload,
  FaFilePdf,
  FaEdit,
  FaTrash,
  FaUpload,
  FaSearch,
  FaPlus,
  FaTrophy,
  FaFileAlt,
  FaUsers
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('submissions');

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  const [systemUsers, setSystemUsers] = useState([]);
  const [filteredSystemUsers, setFilteredSystemUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingSystemUser, setEditingSystemUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    username: '',
    email: '',
    employeeNumber: '',
    role: 'CLIENT',
    password: ''
  });

  const [staffLeaderboard, setStaffLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL ||
    'https://fibuca-backend.vercel.app';

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    api.get('/submissions')
      .then(res => {
        setUsers(res.data);
        setFilteredUsers(res.data);
        generateLeaderboard(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const fetchSystemUsers = useCallback(() => {
    setUserLoading(true);
    api.get('/api/admin/users')
      .then(res => {
        setSystemUsers(res.data || []);
        setFilteredSystemUsers(res.data || []);
      })
      .catch(err => {
        console.error('❌ Failed to fetch users:', err);
        Swal.fire('Error', 'Failed to fetch users', 'error');
      })
      .finally(() => setUserLoading(false));
  }, []);

  const fetchStaffLeaderboard = useCallback(() => {
    setLeaderboardLoading(true);
    api.get('/api/staff/leaderboard')
      .then(res => {
        setStaffLeaderboard(res.data || []);
      })
      .catch(err => {
        console.error('❌ Failed to fetch leaderboard:', err);
        Swal.fire('Error', 'Failed to fetch staff leaderboard', 'error');
      })
      .finally(() => setLeaderboardLoading(false));
  }, []);

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

    fetchSubmissions();
    fetchSystemUsers();
    fetchStaffLeaderboard();
  }, [navigate, fetchSubmissions, fetchSystemUsers, fetchStaffLeaderboard]);

  const handleOpenUserModal = (user = null) => {
    if (user) {
      setEditingSystemUser(user);
      setUserFormData({
        name: user.name,
        username: user.username,
        email: user.email || '',
        employeeNumber: user.employeeNumber || '',
        role: user.role,
        password: ''
      });
    } else {
      setEditingSystemUser(null);
      setUserFormData({
        name: '',
        username: '',
        email: '',
        employeeNumber: '',
        role: 'CLIENT',
        password: ''
      });
    }
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setEditingSystemUser(null);
  };

  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async () => {
    try {
      if (!userFormData.name || !userFormData.username) {
        return Swal.fire('Error', 'Name and Username are required', 'error');
      }

      if (editingSystemUser) {
        await api.put(`/api/admin/users/${editingSystemUser.id}`, {
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role,
          employeeNumber: userFormData.employeeNumber
        });
        Swal.fire('Success!', 'User updated successfully', 'success');
      } else {
        if (!userFormData.password || userFormData.password.length < 6) {
          return Swal.fire('Error', 'Password must be at least 6 characters', 'error');
        }
        await api.post('/api/admin/users', userFormData);
        Swal.fire('Success!', 'User created successfully', 'success');
      }
      handleCloseUserModal();
      fetchSystemUsers();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Failed to save user', 'error');
    }
  };

  const handleDeleteUser = (userId) => {
    Swal.fire({
      title: 'Delete User?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48'
    }).then(result => {
      if (result.isConfirmed) {
        api.delete(`/api/admin/users/${userId}`)
          .then(() => {
            Swal.fire('Deleted!', 'User deleted successfully', 'success');
            fetchSystemUsers();
          })
          .catch(err => Swal.fire('Error', err.response?.data?.error || 'Failed to delete user', 'error'));
      }
    });
  };

  const handleSearchUsers = (value) => {
    if (!value) return setFilteredSystemUsers(systemUsers);
    const results = systemUsers.filter(u =>
      (u.name || '').toLowerCase().includes(value.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(value.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(value.toLowerCase())
    );
    setFilteredSystemUsers(results);
  };

  const generateLeaderboard = (submissions) => {
    const staffMap = {};
    submissions.forEach(sub => {
      if (sub.employeeName) {
        if (!staffMap[sub.employeeName]) {
          staffMap[sub.employeeName] = {
            name: sub.employeeName,
            employeeNumber: sub.employeeNumber || '',
            submissions: 0
          };
        }
        staffMap[sub.employeeName].submissions += 1;
      }
    });
    const leaderboardData = Object.values(staffMap)
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, 5);
    setLeaderboard(leaderboardData);
  };

  const handleSearch = value => {
    if (!value) return setFilteredUsers(users);

    const results = users.filter(u =>
      (u.employeeName || '').toLowerCase().includes(value.toLowerCase()) ||
      (u.employeeNumber || '').toLowerCase().includes(value.toLowerCase()) ||
      (u.employerName || '').toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUsers(results);
  };

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
        fetchSubmissions();
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
            fetchSubmissions();
            Swal.fire('Deleted!', '', 'success');
          })
          .catch(err => console.error(err));
      }
    });
  };

  const handleUploadExcel = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json(worksheet);
      await api.post('/bulk-upload', { records });
      fetchSubmissions();
      Swal.fire('Success', 'Users uploaded!', 'success');
    } catch (err) {
      Swal.fire('Error', 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submissionColumns = [
    { name: '#', selector: (row, index) => index + 1, width: '60px' },
    { name: 'Employee', selector: row => row.employeeName, sortable: true, wrap: true },
    { name: 'Number', selector: row => row.employeeNumber, wrap: true },
    { name: 'Employer', selector: row => row.employerName, wrap: true },
    { name: 'Dues', selector: row => row.dues },
    {
      name: 'PDF',
      cell: row => {
        if (!row.pdfPath) return <span className="text-gray-400">None</span>;
        const pdfUrl = row.pdfPath.startsWith('http') ? row.pdfPath : `${BACKEND_URL}/${row.pdfPath}`;
        return <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline"><FaFilePdf/></a>;
      }
    },
    {
      name: 'Actions',
      cell: row => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(row)} className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"><FaEdit/></button>
          <button onClick={() => handleDelete(row.id)} className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"><FaTrash/></button>
        </div>
      )
    }
  ];

  const userColumns = [
    { name: '#', selector: (row, index) => index + 1, width: '60px' },
    { name: 'Name', selector: row => row.name, sortable: true, wrap: true },
    { name: 'Username', selector: row => row.username, wrap: true },
    { name: 'Email', selector: row => row.email || '-', wrap: true },
    { name: 'Role', selector: row => row.role, sortable: true },
    { name: 'Employee #', selector: row => row.employeeNumber || '-' },
    {
      name: 'Actions',
      cell: row => (
        <div className="flex gap-2">
          <button onClick={() => handleOpenUserModal(row)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"><FaEdit/></button>
          <button onClick={() => handleDeleteUser(row.id)} className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"><FaTrash/></button>
        </div>
      )
    }
  ];

  const navbarTabs = [
    { id: 'submissions', label: 'Submissions', icon: FaFileAlt },
    { id: 'users', label: 'Users', icon: FaUsers },
    { id: 'leaderboard', label: 'Leaderboard', icon: FaTrophy }
  ];

  const renderDesktopTabNav = () => (
    <div className="hidden md:block w-64 shrink-0">
      <div className="bg-white rounded-xl shadow-lg p-3 sticky top-6">
        <div className="text-sm font-bold text-gray-500 uppercase tracking-wide px-3 py-2">
          Admin Sections
        </div>
        <div className="space-y-1">
          {navbarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-28 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage submissions, users, and staff performance</p>
        </div>

        <div className="flex gap-6">
          {renderDesktopTabNav()}

          <div className="flex-1 min-w-0">
            {activeTab === 'submissions' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <h2 className="text-2xl font-bold">Client Submissions</h2>
                    <div className="relative w-full md:w-80">
                      <FaSearch className="absolute top-3 left-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search submissions..."
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition">
                      <FaUpload className="inline mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Excel'}
                      <input type="file" accept=".xlsx,.xls" hidden onChange={handleUploadExcel} />
                    </label>
                    <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                      <FaDownload className="inline mr-2" /> Excel
                    </button>
                    <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                      <FaFilePdf className="inline mr-2" /> PDF
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <DataTable
                    columns={submissionColumns}
                    data={filteredUsers}
                    pagination
                    progressPending={loading}
                    highlightOnHover
                    responsive
                    striped
                  />
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <h2 className="text-2xl font-bold">System Users</h2>
                    <div className="flex gap-3 flex-wrap">
                      <div className="relative w-full md:w-80">
                        <FaSearch className="absolute top-3 left-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          onChange={e => handleSearchUsers(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleOpenUserModal()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaPlus /> Add User
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <DataTable
                    columns={userColumns}
                    data={filteredSystemUsers}
                    pagination
                    progressPending={userLoading}
                    highlightOnHover
                    responsive
                    striped
                  />
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-6">Staff Performance Leaderboard</h2>
                  <p className="text-gray-600 mb-4">Ranked by number of active distribution links</p>

                  {leaderboardLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading leaderboard...</div>
                  ) : staffLeaderboard.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {staffLeaderboard.map((staff, idx) => (
                        <div
                          key={staff.id}
                          className={`p-6 rounded-lg border-2 ${
                            idx === 0
                              ? 'border-yellow-400 bg-yellow-50'
                              : idx === 1
                              ? 'border-gray-400 bg-gray-50'
                              : idx === 2
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-blue-200 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-sm font-semibold text-gray-600 mb-1">
                                {idx === 0 && '🥇 '}
                                {idx === 1 && '🥈 '}
                                {idx === 2 && '🥉 '}
                                Rank #{idx + 1}
                              </div>
                              <h3 className="text-lg font-bold text-gray-800">{staff.name}</h3>
                              <p className="text-sm text-gray-600">{staff.username}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{staff.activeLinks}</div>
                              <div className="text-xs text-gray-600">Active Links</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{staff.totalLinks}</div>
                              <div className="text-xs text-gray-600">Total Links</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">{staff.totalClients}</div>
                              <div className="text-xs text-gray-600">Clients</div>
                            </div>
                          </div>

                          {staff.email && (
                            <p className="text-xs text-gray-600 mt-3 truncate">📧 {staff.email}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No staff members found
                    </div>
                  )}
                </div>

                {leaderboard.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Top Submission Users</h3>
                    <div className="space-y-2">
                      {leaderboard.map((staff, idx) => (
                        <div key={staff.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                          <span className="font-semibold text-gray-800">
                            {idx === 0 && '🥇 '}
                            {idx === 1 && '🥈 '}
                            {idx === 2 && '🥉 '}
                            {staff.name}
                          </span>
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">{staff.submissions}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl">
            <h2 className="text-xl font-bold mb-4">Edit Submission</h2>
            {Object.keys(editForm).map(field => (
              <div key={field} className="mb-3">
                <label className="block text-sm font-medium mb-1 capitalize">{field}</label>
                <input
                  value={editForm[field]}
                  onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSystemUser ? 'Edit User' : 'Create New User'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={userFormData.name}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input
                  type="text"
                  name="username"
                  value={userFormData.username}
                  onChange={handleUserFormChange}
                  disabled={!!editingSystemUser}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  placeholder="Unique username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={userFormData.email}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Number</label>
                <input
                  type="text"
                  name="employeeNumber"
                  value={userFormData.employeeNumber}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  name="role"
                  value={userFormData.role}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="CLIENT">Client</option>
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {!editingSystemUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={userFormData.password}
                    onChange={handleUserFormChange}
                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Min. 6 characters"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseUserModal}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingSystemUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} tabs={navbarTabs} />
    </div>
  );
}