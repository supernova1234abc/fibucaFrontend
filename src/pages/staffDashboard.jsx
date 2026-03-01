// src/pages/StaffDashboard.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DataTable from 'react-data-table-component';
import BottomNavbar from '../components/BottomNavbar';
import {
  FaDownload,
  FaFilePdf,
  FaLink,
  FaSearch,
  FaUsers,
  FaChartLine,
  FaClock
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

export default function StaffDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('links');
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL ||
    'https://fibuca-backend.vercel.app';

  const VITE_FRONTEND_URL =
    import.meta.env.VITE_FRONTEND_URL ||
    window.location.origin;

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchSubmissions();
    fetchLinks();
  }, []);

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    api.get('/api/staff/submissions')
      .then(res => {
        setSubmissions(res.data);
        setFilteredSubs(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchLinks = () => {
    api.get('/api/staff/links')
      .then(res => setLinks(res.data))
      .catch(console.error);
  };

  /* ================= STATS ================= */

  const stats = useMemo(() => {
    const now = new Date();

    const activeLinks = links.filter(l => {
      const expired = l.expiresAt && new Date(l.expiresAt) < now;
      const maxed = l.maxUses && l.usedCount >= l.maxUses;
      return l.isActive && !expired && !maxed;
    }).length;

    const expiredLinks = links.length - activeLinks;

    return {
      totalClients: submissions.length,
      totalLinks: links.length,
      activeLinks,
      expiredLinks
    };
  }, [links, submissions]);

  /* ================= SEARCH ================= */

  const handleSearch = value => {
    if (!value) return setFilteredSubs(submissions);

    const results = submissions.filter(s =>
      (s.employeeName || '').toLowerCase().includes(value.toLowerCase()) ||
      (s.employeeNumber || '').toLowerCase().includes(value.toLowerCase()) ||
      (s.employerName || '').toLowerCase().includes(value.toLowerCase())
    );

    setFilteredSubs(results);
  };

  /* ================= EXPORT ================= */

  const exportToExcel = () => {
    if (!filteredSubs.length)
      return Swal.fire('No Data', 'No records found.', 'info');

    const data = filteredSubs.map((s, index) => ({
      SN: index + 1,
      Name: s.employeeName,
      Number: s.employeeNumber,
      Employer: s.employerName,
      Dues: s.dues,
      Submitted: s.submittedAt
        ? new Date(s.submittedAt).toLocaleString()
        : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    XLSX.writeFile(workbook, 'staff_submissions.xlsx');
  };

  const exportToPDF = () => {
    if (!filteredSubs.length)
      return Swal.fire('No Data', 'No records found.', 'info');

    const doc = new jsPDF();
    autoTable(doc, {
      head: [['SN', 'Name', 'Number', 'Employer', 'Dues', 'Submitted']],
      body: filteredSubs.map((s, index) => [
        index + 1,
        s.employeeName,
        s.employeeNumber,
        s.employerName,
        s.dues,
        s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ''
      ])
    });
    doc.save('staff_submissions.pdf');
  };

  /* ================= GENERATE LINK ================= */

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const { value: formValues } = await Swal.fire({
        title: 'Generate Link',
        html:
          '<input id="swal-hours" class="swal2-input" placeholder="Hours valid" type="number">' +
          '<input id="swal-max" class="swal2-input" placeholder="Max uses (optional)" type="number">',
        focusConfirm: false,
        preConfirm: () => ({
          hoursValid: parseInt(document.getElementById('swal-hours').value) || 24,
          maxUses: parseInt(document.getElementById('swal-max').value) || null
        })
      });

      if (!formValues) return;

      const res = await api.post('/api/staff/generate-link', formValues);

      Swal.fire(
        'Link Generated',
        `<a href="${res.data.link}" target="_blank">${res.data.link}</a>`,
        'success'
      );

      fetchLinks();
    } catch (err) {
      Swal.fire('Error', 'Failed to generate link.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  /* ================= DELETE LINK ================= */

  const handleDeleteLink = async (id, usedCount) => {
    if (usedCount > 0)
      return Swal.fire('Locked', 'Cannot delete used link.', 'info');

    const confirm = await Swal.fire({
      title: 'Delete Link?',
      icon: 'warning',
      showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    await api.delete(`/api/staff/link/${id}`);
    fetchLinks();
  };

  async function refreshLinkStatus(link) {
  const now = new Date();

  let shouldDeactivate = false;

  if (link.expiresAt && link.expiresAt < now) {
    shouldDeactivate = true;
  }

  if (link.maxUses && link.usedCount >= link.maxUses) {
    shouldDeactivate = true;
  }

  if (shouldDeactivate && link.isActive) {
    await prisma.staffLink.update({
      where: { id: link.id },
      data: { isActive: false }
    });
    link.isActive = false;
  }

  return link;
}

  /* ================= TABLES ================= */

  const clientColumns = [
    { name: '#', selector: (row, i) => i + 1, width: '60px' },
    { name: 'Employee', selector: r => r.employeeName, sortable: true },
    { name: 'Number', selector: r => r.employeeNumber },
    { name: 'Employer', selector: r => r.employerName },
    { name: 'Dues', selector: r => r.dues }
  ];

  const linkColumns = [
    { name: '#', selector: (row, i) => i + 1, width: '60px' },
    {
      name: 'Link',
      wrap: true,
      cell: row => (
        <a
          href={`${VITE_FRONTEND_URL}/submission/${row.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {row.token}
        </a>
      )
    },
    { name: 'Max Uses', selector: r => r.maxUses || 'Unlimited' },
    { name: 'Used', selector: r => r.usedCount },
    {
      name: 'Status',
      cell: row => {
        const now = new Date();
        const expired = row.expiresAt && new Date(row.expiresAt) < now;
        const maxed = row.maxUses && row.usedCount >= row.maxUses;

        if (!row.isActive || expired || maxed)
          return <span className="text-red-600 font-semibold">Expired</span>;

        return <span className="text-green-600 font-semibold">Active</span>;
      }
    },
    {
      name: 'Delete',
      cell: row =>
        row.usedCount === 0 ? (
          <button
            onClick={() => handleDeleteLink(row._id, row.usedCount)}
            className="text-red-600 hover:underline"
          >
            Delete
          </button>
        ) : (
          <span className="text-gray-400">Locked</span>
        )
    }
  ];

  /* ================= UI ================= */

  const navbarTabs = [
    { id: 'links', label: 'Links', icon: FaLink },
    { id: 'clients', label: 'Clients', icon: FaUsers },
    { id: 'profile', label: 'Profile', icon: FaChartLine }
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-28">
      <div className="max-w-7xl mx-auto space-y-6 p-6">

        <h1 className="text-3xl font-bold">Staff Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard icon={<FaUsers />} label="Clients" value={stats.totalClients} />
          <StatCard icon={<FaLink />} label="Total Links" value={stats.totalLinks} />
          <StatCard icon={<FaChartLine />} label="Active Links" value={stats.activeLinks} />
          <StatCard icon={<FaClock />} label="Expired Links" value={stats.expiredLinks} />
        </div>

        {/* LINKS TAB */}
        {activeTab === 'links' && (
          <>
            <button
              onClick={handleGenerateLink}
              className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
            >
              Generate Link
            </button>

            <div className="bg-white rounded shadow mt-4">
              <DataTable
                columns={linkColumns}
                data={links}
                pagination
                highlightOnHover
                responsive
              />
            </div>
          </>
        )}

        {/* CLIENTS TAB */}
        {activeTab === 'clients' && (
          <>
            <div className="flex gap-3 mt-4">
              <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded">
                Excel
              </button>
              <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded">
                PDF
              </button>
            </div>

            <div className="bg-white rounded shadow mt-4">
              <DataTable
                columns={clientColumns}
                data={filteredSubs}
                pagination
                highlightOnHover
                responsive
              />
            </div>
          </>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded shadow mt-4 space-y-2">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>Total Clients Served:</strong> {stats.totalClients}</p>
            <p><strong>Total Links Generated:</strong> {stats.totalLinks}</p>
          </div>
        )}

      </div>

      {/* Bottom Navbar */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} tabs={navbarTabs} />
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
      <div className="text-blue-600 text-2xl">{icon}</div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}