// src/pages/StaffDashboard.jsx
import { useEffect, useState, useCallback, useMemo, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import DataTable from "react-data-table-component";
import BottomNavbar from "../components/BottomNavbar";
import { DashboardSectionMenuContext } from "../components/DashboardLayout";
import {
  FaDownload,
  FaFilePdf,
  FaFileAlt,
  FaLink,
  FaUsers,
  FaChartLine,
  FaClock,
  FaCopy,
  FaQrcode,
  FaComments,
  FaPaperPlane,
  FaPrint,
  FaBullhorn,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
//import QRCode from "react-qr-code";
import { QRCodeSVG as QRCode } from "qrcode.react";

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setSectionMenus = useContext(DashboardSectionMenuContext);

  const activeTab = location.pathname.endsWith("/clients")
    ? "clients"
    : location.pathname.endsWith("/profile")
    ? "profile"
    : location.pathname.endsWith("/notices")
    ? "notices"
    : location.pathname.endsWith("/complaints")
    ? "complaints"
    : "links";

  const navbarTabs = [
    { id: "links", label: "Links", icon: FaLink, href: "/staff/links" },
    { id: "clients", label: "Clients", icon: FaUsers, href: "/staff/clients" },
    { id: "complaints", label: "Complaints", icon: FaComments, href: "/staff/complaints" },
    { id: "notices", label: "Notices", icon: FaBullhorn, href: "/staff/notices" },
    { id: "profile", label: "Profile", icon: FaChartLine, href: "/staff/profile" },
  ];

  useEffect(() => {
    setSectionMenus(navbarTabs);
    return () => setSectionMenus([]);
  }, [setSectionMenus]);

  const [submissions, setSubmissions] = useState([]);
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [nowMs, setNowMs] = useState(Date.now());

  const [officialDocuments, setOfficialDocuments] = useState([]);
  const [officialUpdates, setOfficialUpdates] = useState([]);
  const [docForm, setDocForm] = useState({ title: "", description: "", fileUrl: "" });
  const [updateForm, setUpdateForm] = useState({ title: "", category: "", message: "" });
  const [publishingDoc, setPublishingDoc] = useState(false);
  const [publishingUpdate, setPublishingUpdate] = useState(false);

  const VITE_FRONTEND_URL =
    import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  useEffect(() => {
    fetchSubmissions();
    fetchLinks();
    fetchComplaints();
    fetchOfficialData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    api.get("/api/staff/submissions")
      .then((res) => {
        setSubmissions(res.data || []);
        setFilteredSubs(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchLinks = () => {
    api.get("/api/staff/links")
      .then((res) => setLinks(res.data || []))
      .catch(console.error);
  };

  const fetchComplaints = () => {
    setLoadingComplaints(true);
    api.get("/api/staff/complaints")
      .then((res) => setComplaints(res.data || []))
      .catch((err) => {
        console.error(err);
        toast.error("Failed to fetch complaints");
      })
      .finally(() => setLoadingComplaints(false));
  };

  const fetchOfficialData = async () => {
    try {
      const [docsRes, updatesRes] = await Promise.all([
        api.get("/api/client/documents"),
        api.get("/api/client/updates"),
      ]);
      setOfficialDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
      setOfficialUpdates(Array.isArray(updatesRes.data) ? updatesRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch official documents/updates");
    }
  };

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
      totalComplaints: complaints.length,
      openComplaints: complaints.filter((c) => c.status === "OPEN").length,
    };
  }, [links, submissions, complaints]);

  const handleSearch = (value) => {
    if (!value) return setFilteredSubs(submissions);

    const results = submissions.filter((s) =>
      (s.employeeName || "").toLowerCase().includes(value.toLowerCase()) ||
      (s.employeeNumber || "").toLowerCase().includes(value.toLowerCase()) ||
      (s.employerName || "").toLowerCase().includes(value.toLowerCase()) ||
      (s.branchName || "").toLowerCase().includes(value.toLowerCase()) ||
      (s.phoneNumber || "").toLowerCase().includes(value.toLowerCase())
    );

    setFilteredSubs(results);
  };

  const exportToExcel = () => {
    if (!filteredSubs.length) {
      return Swal.fire("No Data", "No records found.", "info");
    }

    const data = filteredSubs.map((s, index) => ({
      SN: index + 1,
      Name: s.employeeName,
      Number: s.employeeNumber,
      Employer: s.employerName,
      Branch: s.branchName || "",
      Phone: s.phoneNumber || "",
      Dues: s.dues,
      Submitted: s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    XLSX.writeFile(workbook, "staff_submissions.xlsx");
  };

  const exportToPDF = () => {
    if (!filteredSubs.length) {
      return Swal.fire("No Data", "No records found.", "info");
    }

    const doc = new jsPDF();
    autoTable(doc, {
      head: [["SN", "Name", "Number", "Employer", "Branch", "Phone", "Dues", "Submitted"]],
      body: filteredSubs.map((s, index) => [
        index + 1,
        s.employeeName,
        s.employeeNumber,
        s.employerName,
        s.branchName || "",
        s.phoneNumber || "",
        s.dues,
        s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "",
      ]),
    });
    doc.save("staff_submissions.pdf");
  };

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
          hoursValid: parseInt(document.getElementById("swal-hours").value) || 24,
          maxUses: parseInt(document.getElementById("swal-max").value) || null,
        }),
      });

      if (!formValues) return;

      const res = await api.post("/api/staff/generate-link", formValues);
      const code = res.data.code;

      await Swal.fire({
        title: "Link Generated",
        html: `<div class="text-left"><div class="font-semibold mb-1">Share Code:</div><div class="text-lg tracking-wide">${code}</div><div class="text-xs text-gray-500 mt-2">Use Copy to share full link securely.</div></div>`,
        icon: "success",
      });

      fetchLinks();
    } catch (err) {
      Swal.fire("Error", "Failed to generate link.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteLink = async (id, usedCount) => {
    if (usedCount > 0) {
      return Swal.fire("Locked", "Cannot delete used link.", "info");
    }

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
      Swal.fire("Error", err.response?.data?.error || "Failed to delete link", "error");
    }
  };

  const handleCopyLink = async (token) => {
    const url = `${VITE_FRONTEND_URL}/submission/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShowQr = async (token) => {
    const url = `${VITE_FRONTEND_URL}/submission/${token}`;

    await Swal.fire({
      title: "Scan QR Code",
      html: `
        <button id="print-qr-btn" style="margin-bottom:10px;padding:6px 18px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:6px;">&#128438; Print QR</button>
        <div id="qr-wrap" style="display:flex;flex-direction:column;align-items:center;gap:12px;"></div>
        <div style="margin-top:12px;word-break:break-all;font-size:12px;">${url}</div>
      `,
      didOpen: () => {
        const wrap = document.getElementById("qr-wrap");
        if (wrap) {
          const container = document.createElement("div");
          container.id = "qr-svg-container";
          wrap.appendChild(container);
          import("react-dom/client").then(({ createRoot }) => {
            const root = createRoot(container);
            root.render(<QRCode value={url} size={180} />);
          });
        }

        const printBtn = document.getElementById("print-qr-btn");
        if (printBtn) {
          printBtn.addEventListener("click", () => {
            const svgEl = document.querySelector("#qr-svg-container svg");
            const svgHtml = svgEl ? svgEl.outerHTML : "";
            const win = window.open("", "_blank", "width=400,height=520");
            if (!win) return;
            win.document.write(`<!DOCTYPE html><html><head><title>FIBUCA QR Code</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff;}p{font-size:11px;word-break:break-all;max-width:280px;text-align:center;margin-top:12px;color:#555;}h2{font-size:16px;margin-bottom:8px;}</style></head><body><h2>FIBUCA Submission Link</h2>${svgHtml}<p>${url}</p></body></html>`);
            win.document.close();
            setTimeout(() => { win.print(); win.close(); }, 400);
          });
        }
      },
      width: 420,
      confirmButtonText: "Close",
    });
  };

  const formatTimeLeft = (expiresAt) => {
    if (!expiresAt) return "No expiry";
    const diffMs = new Date(expiresAt).getTime() - nowMs;
    if (diffMs <= 0) return "Expired";
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  const publishDocument = async () => {
    if (!docForm.title.trim() || !docForm.fileUrl.trim()) {
      return toast.error("Title and document URL are required");
    }
    try {
      setPublishingDoc(true);
      await api.post("/api/staff/documents", docForm);
      setDocForm({ title: "", description: "", fileUrl: "" });
      toast.success("Document published");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to publish document");
    } finally {
      setPublishingDoc(false);
    }
  };

  const publishUpdate = async () => {
    if (!updateForm.title.trim() || !updateForm.message.trim()) {
      return toast.error("Title and message are required");
    }
    try {
      setPublishingUpdate(true);
      await api.post("/api/staff/updates", updateForm);
      setUpdateForm({ title: "", category: "", message: "" });
      toast.success("Update published");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to publish update");
    } finally {
      setPublishingUpdate(false);
    }
  };

  const updateComplaintStatus = async (id, status) => {
    try {
      await api.put(`/api/staff/complaints/${id}/status`, { status });
      toast.success("Status updated");
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const sendReply = async (complaintId) => {
    const message = (replyDrafts[complaintId] || "").trim();
    if (!message) return toast.error("Reply message is required");

    try {
      await api.post(`/api/staff/complaints/${complaintId}/reply`, { message });
      toast.success("Reply sent");
      setReplyDrafts((prev) => ({ ...prev, [complaintId]: "" }));
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    }
  };

  const clientColumns = [
    { name: "#", selector: (_, i) => i + 1, width: "60px" },
    { name: "Employee", selector: (r) => r.employeeName, sortable: true, wrap: true },
    { name: "Number", selector: (r) => r.employeeNumber, wrap: true },
    { name: "Employer", selector: (r) => r.employerName, wrap: true },
    { name: "Branch", selector: (r) => r.branchName || "-", wrap: true },
    { name: "Phone", selector: (r) => r.phoneNumber || "-", wrap: true },
    { name: "Dues", selector: (r) => r.dues },
  ];

  const linkColumns = [
    { name: "#", selector: (_, i) => i + 1, width: "60px" },
    {
      name: "Code",
      wrap: true,
      cell: (row) => <span className="font-mono text-sm">{String(row.token || "").slice(0, 12)}</span>,
    },
    { name: "Max Uses", selector: (r) => r.maxUses || "Unlimited" },
    { name: "Used", selector: (r) => r.usedCount },
    {
      name: "Status",
      cell: (row) => {
        const now = new Date();
        const expired = row.expiresAt && new Date(row.expiresAt) < now;
        const maxed = row.maxUses && row.usedCount >= row.maxUses;

        if (!row.isActive || expired || maxed) {
          return <span className="text-red-600 font-semibold">Expired</span>;
        }

        return (
          <div className="text-xs">
            <div className="text-green-600 font-semibold">Active</div>
            <div className="text-slate-500">{formatTimeLeft(row.expiresAt)} left</div>
          </div>
        );
      },
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap min-w-[170px]">
          <button
            onClick={() => handleCopyLink(row.token)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FaCopy /> Copy
          </button>

          <button
            onClick={() => handleShowQr(row.token)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <FaQrcode /> QR
          </button>

          {row.usedCount === 0 ? (
            <button
              onClick={() => handleDeleteLink(row.id, row.usedCount)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          ) : (
            <span className="text-gray-400 text-xs">Locked</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-28 md:pb-0">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>

        <div className="grid md:grid-cols-5 gap-4">
          <StatCard icon={<FaUsers />} label="Clients" value={stats.totalClients} />
          <StatCard icon={<FaLink />} label="Total Links" value={stats.totalLinks} />
          <StatCard icon={<FaChartLine />} label="Active Links" value={stats.activeLinks} />
          <StatCard icon={<FaClock />} label="Expired Links" value={stats.expiredLinks} />
          <StatCard icon={<FaComments />} label="Open Complaints" value={stats.openComplaints} />
        </div>

        {activeTab === "links" && (
          <>
            <button
              onClick={handleGenerateLink}
              disabled={generating}
              className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
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
              />
            </div>
          </>
        )}

        {activeTab === "clients" && (
          <>
            <div className="flex flex-col md:flex-row gap-3 mt-4 md:items-center md:justify-between">
              <input
                type="text"
                placeholder="Search by name, number, employer, branch, phone..."
                onChange={(e) => handleSearch(e.target.value)}
                className="border rounded px-3 py-2 w-full md:max-w-md"
              />

              <div className="flex gap-3">
                <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded">
                  Excel
                </button>
                <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded">
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
              />
            </div>
          </>
        )}

        {activeTab === "complaints" && (
          <div className="space-y-4">
            {loadingComplaints ? (
              <div className="bg-white p-6 rounded shadow text-gray-500">Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div className="bg-white p-6 rounded shadow text-gray-500">No complaints found.</div>
            ) : (
              complaints.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded shadow space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{c.subject}</h3>
                      <p className="text-sm text-gray-600">
                        {c.user?.name} • {c.user?.employeeNumber}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateComplaintStatus(c.id, "OPEN")}
                        className={`px-3 py-1 rounded text-sm ${
                          c.status === "OPEN"
                            ? "bg-yellow-500 text-white"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        OPEN
                      </button>
                      <button
                        onClick={() => updateComplaintStatus(c.id, "RESOLVED")}
                        className={`px-3 py-1 rounded text-sm ${
                          c.status === "RESOLVED"
                            ? "bg-green-600 text-white"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        RESOLVED
                      </button>
                      <button
                        onClick={() => updateComplaintStatus(c.id, "CLOSED")}
                        className={`px-3 py-1 rounded text-sm ${
                          c.status === "CLOSED"
                            ? "bg-gray-700 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        CLOSED
                      </button>
                    </div>
                  </div>

                  <div className="border rounded p-3 bg-gray-50">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{c.message}</p>
                  </div>

                  {c.replies?.length > 0 && (
                    <div className="space-y-2">
                      {c.replies.map((r) => (
                        <div key={r.id} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
                          <div className="text-sm font-semibold text-blue-900">
                            {r.sender?.name} ({r.sender?.role})
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {new Date(r.createdAt).toLocaleString()}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={replyDrafts[c.id] || ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                      placeholder="Write reply..."
                      className="w-full border rounded px-3 py-2"
                    />
                    <button
                      onClick={() => sendReply(c.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <FaPaperPlane /> Send Reply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bg-white p-6 rounded shadow mt-4 space-y-2">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>Total Clients Served:</strong> {stats.totalClients}</p>
            <p><strong>Total Links Generated:</strong> {stats.totalLinks}</p>
            <p><strong>Total Complaints:</strong> {stats.totalComplaints}</p>
          </div>
        )}

        {activeTab === "notices" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded shadow space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><FaFileAlt /> Publish Official Document</h3>
              <input
                type="text"
                placeholder="Document title"
                value={docForm.title}
                onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Document URL (Cloudinary/Drive/etc)"
                value={docForm.fileUrl}
                onChange={(e) => setDocForm((p) => ({ ...p, fileUrl: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <textarea
                rows={3}
                placeholder="Description (optional)"
                value={docForm.description}
                onChange={(e) => setDocForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <button
                onClick={publishDocument}
                disabled={publishingDoc}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {publishingDoc ? "Publishing..." : "Publish Document"}
              </button>
            </div>

            <div className="bg-white p-5 rounded shadow space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><FaBullhorn /> Publish News / Update</h3>
              <input
                type="text"
                placeholder="Update title"
                value={updateForm.title}
                onChange={(e) => setUpdateForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={updateForm.category}
                onChange={(e) => setUpdateForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <textarea
                rows={4}
                placeholder="Message"
                value={updateForm.message}
                onChange={(e) => setUpdateForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <button
                onClick={publishUpdate}
                disabled={publishingUpdate}
                className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-black"
              >
                {publishingUpdate ? "Publishing..." : "Publish Update"}
              </button>
            </div>

            <div className="bg-white p-5 rounded shadow">
              <h4 className="font-semibold mb-2">Latest Published Documents</h4>
              {officialDocuments.length === 0 ? (
                <p className="text-sm text-gray-500">No documents published yet.</p>
              ) : (
                <div className="space-y-2">
                  {officialDocuments.slice(0, 8).map((d) => (
                    <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="block border rounded p-3 hover:bg-slate-50">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNavbar tabs={navbarTabs} />
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