// src/pages/StaffDashboard.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import DataTable from "react-data-table-component";
import BottomNavbar from "../components/BottomNavbar";
import {
  FaDownload,
  FaLink,
  FaUsers,
  FaChartLine,
  FaClock,
  FaQrcode,
  FaCopy,
  FaPrint,
  FaTimes,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import { QRCodeSVG as QRCode } from "qrcode.react";

export default function StaffDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("links");
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // QR modal state
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrToken, setQrToken] = useState("");
  const printAreaRef = useRef(null);

  const VITE_FRONTEND_URL =
    import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchSubmissions();
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    api
      .get("/api/staff/submissions")
      .then((res) => {
        setSubmissions(res.data);
        setFilteredSubs(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchLinks = useCallback(() => {
    api
      .get("/api/staff/links")
      .then((res) => setLinks(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  }, []);

  /* ================= STATS ================= */

  const stats = useMemo(() => {
    const now = new Date();

    const activeLinks = links.filter((l) => {
      const expired = l.expiresAt && new Date(l.expiresAt) < now;
      const maxed = l.maxUses && l.usedCount >= l.maxUses;
      return l.isActive && !expired && !maxed;
    }).length;

    const expiredLinks = links.length - activeLinks;

    return {
      totalClients: submissions.length,
      totalLinks: links.length,
      activeLinks,
      expiredLinks,
    };
  }, [links, submissions]);

  /* ================= SEARCH ================= */

  const handleSearch = (value) => {
    if (!value) return setFilteredSubs(submissions);

    const q = value.toLowerCase();
    const results = submissions.filter((s) => {
      return (
        (s.employeeName || "").toLowerCase().includes(q) ||
        (s.employeeNumber || "").toLowerCase().includes(q) ||
        (s.employerName || "").toLowerCase().includes(q)
      );
    });

    setFilteredSubs(results);
  };

  /* ================= EXPORT ================= */

  const exportToExcel = () => {
    if (!filteredSubs.length)
      return Swal.fire("No Data", "No records found.", "info");

    const data = filteredSubs.map((s, index) => ({
      SN: index + 1,
      Name: s.employeeName,
      Number: s.employeeNumber,
      Employer: s.employerName,
      Dues: s.dues,
      Submitted: s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    XLSX.writeFile(workbook, "staff_submissions.xlsx");
  };

  const exportToPDF = () => {
    if (!filteredSubs.length)
      return Swal.fire("No Data", "No records found.", "info");

    const doc = new jsPDF();
    autoTable(doc, {
      head: [["SN", "Name", "Number", "Employer", "Dues", "Submitted"]],
      body: filteredSubs.map((s, index) => [
        index + 1,
        s.employeeName,
        s.employeeNumber,
        s.employerName,
        s.dues,
        s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "",
      ]),
    });
    doc.save("staff_submissions.pdf");
  };

  /* ================= GENERATE LINK ================= */

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const { value: formValues } = await Swal.fire({
        title: "Generate Link",
        html:
          '<input id="swal-hours" class="swal2-input" placeholder="Hours valid" type="number">' +
          '<input id="swal-max" class="swal2-input" placeholder="Max uses (optional)" type="number">',
        focusConfirm: false,
        preConfirm: () => ({
          hoursValid:
            parseInt(document.getElementById("swal-hours").value, 10) || 24,
          maxUses:
            parseInt(document.getElementById("swal-max").value, 10) || null,
        }),
      });

      if (!formValues) return;

      const res = await api.post("/api/staff/generate-link", formValues);

      Swal.fire(
        "Link Generated",
        `<div style="word-break:break-all">
           <a href="${res.data.link}" target="_blank" rel="noreferrer">${res.data.link}</a>
         </div>`,
        "success"
      );

      fetchLinks();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to generate link.", "error");
    } finally {
      setGenerating(false);
    }
  };

  /* ================= DELETE LINK ================= */

  const handleDeleteLink = async (id, usedCount) => {
    if (usedCount > 0)
      return Swal.fire("Locked", "Cannot delete used link.", "info");

    const confirm = await Swal.fire({
      title: "Delete Link?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/api/staff/link/${id}`);
      Swal.fire("Deleted!", "Link deleted successfully", "success");
      fetchLinks();
    } catch (err) {
      console.error("Delete link error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.error || "Failed to delete link",
        "error"
      );
    }
  };

  /* ================= QR HELPERS ================= */

  const openQr = (token) => {
    const url = `${VITE_FRONTEND_URL}/submission/${token}`;
    setQrToken(token);
    setQrUrl(url);
    setQrOpen(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire("Copied", "Link copied to clipboard", "success");
    } catch {
      Swal.fire("Copy failed", "Please copy manually", "error");
    }
  };

  const printQr = () => {
    // prints only the QR modal content
    const html = printAreaRef.current?.innerHTML || "";
    const w = window.open("", "PRINT", "height=700,width=900");
    if (!w) return;

    w.document.write(`
      <html>
        <head>
          <title>Print QR</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .box { max-width: 520px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; padding: 18px; }
            .center { text-align: center; }
            .small { font-size: 12px; color: #444; word-break: break-all; }
            .title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
            .hint { font-size: 12px; color: #666; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="box">${html}</div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  /* ================= TABLES ================= */

  const clientColumns = [
    { name: "#", selector: (row, i) => i + 1, width: "60px" },
    { name: "Employee", selector: (r) => r.employeeName, sortable: true },
    { name: "Number", selector: (r) => r.employeeNumber },
    { name: "Employer", selector: (r) => r.employerName },
    { name: "Dues", selector: (r) => r.dues },
  ];

  const linkColumns = [
    { name: "#", selector: (row, i) => i + 1, width: "60px" },
    {
      name: "Link",
      wrap: true,
      cell: (row) => {
        const url = `${VITE_FRONTEND_URL}/submission/${row.token}`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
            style={{ wordBreak: "break-all" }}
          >
            {url}
          </a>
        );
      },
    },
    { name: "Max Uses", selector: (r) => r.maxUses || "Unlimited" },
    { name: "Used", selector: (r) => r.usedCount },
    {
      name: "Status",
      cell: (row) => {
        const now = new Date();
        const expired = row.expiresAt && new Date(row.expiresAt) < now;
        const maxed = row.maxUses && row.usedCount >= row.maxUses;

        if (!row.isActive || expired || maxed)
          return <span className="text-red-600 font-semibold">Expired</span>;

        return <span className="text-green-600 font-semibold">Active</span>;
      },
    },
    {
      name: "QR",
      cell: (row) => (
        <button
          onClick={() => openQr(row.token)}
          className="inline-flex items-center gap-2 text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
        >
          <FaQrcode /> QR
        </button>
      ),
      width: "120px",
    },
    {
      name: "Delete",
      cell: (row) =>
        row.usedCount === 0 ? (
          <button
            onClick={() => handleDeleteLink(row.id, row.usedCount)}
            className="text-red-600 hover:underline font-semibold"
          >
            Delete
          </button>
        ) : (
          <span className="text-gray-400">Locked</span>
        ),
    },
  ];

  /* ================= UI ================= */

  const navbarTabs = [
    { id: "links", label: "Links", icon: FaLink },
    { id: "clients", label: "Clients", icon: FaUsers },
    { id: "profile", label: "Profile", icon: FaChartLine },
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
        {activeTab === "links" && (
          <>
            <button
              onClick={handleGenerateLink}
              disabled={generating}
              className={`text-white px-4 py-2 rounded mt-4 ${
                generating ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {generating ? "Generating..." : "Generate Link"}
            </button>

            <div className="bg-white rounded shadow mt-4">
              <DataTable
                columns={linkColumns}
                data={links}
                pagination
                highlightOnHover
                responsive
                progressPending={loading}
              />
            </div>
          </>
        )}

        {/* CLIENTS TAB */}
        {activeTab === "clients" && (
          <>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mt-4">
              <input
                placeholder="Search name / number / employer"
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-white border border-gray-300 rounded px-3 py-2 w-full md:w-96"
              />

              <div className="flex gap-3">
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  PDF
                </button>
              </div>
            </div>

            <div className="bg-white rounded shadow mt-4">
              <DataTable
                columns={clientColumns}
                data={filteredSubs}
                pagination
                highlightOnHover
                responsive
                progressPending={loading}
              />
            </div>
          </>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="bg-white p-6 rounded shadow mt-4 space-y-2">
            <p>
              <strong>Name:</strong> {user?.name}
            </p>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Role:</strong> {user?.role}
            </p>
            <p>
              <strong>Total Clients Served:</strong> {stats.totalClients}
            </p>
            <p>
              <strong>Total Links Generated:</strong> {stats.totalLinks}
            </p>
          </div>
        )}
      </div>

      {/* QR MODAL */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setQrOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg p-5 z-10">
            <button
              onClick={() => setQrOpen(false)}
              className="absolute top-3 right-3 text-gray-700 hover:text-black"
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>

            {/* Printable area */}
            <div ref={printAreaRef}>
              <div className="text-center">
                <div className="text-lg font-bold mb-2">FIBUCA Form Link</div>
                <div className="inline-block bg-white p-3 rounded-lg border">
                  <QRCode value={qrUrl} size={240} includeMargin />
                </div>
                <div className="mt-3 text-sm font-semibold">Scan to open:</div>
                <div className="mt-1 text-xs text-gray-700" style={{ wordBreak: "break-all" }}>
                  {qrUrl}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Token: {qrToken}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              <button
                onClick={() => copyToClipboard(qrUrl)}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                <FaCopy /> Copy Link
              </button>

              <button
                onClick={printQr}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                <FaPrint /> Print QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navbar */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} tabs={navbarTabs} />
    </div>
  );
}

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