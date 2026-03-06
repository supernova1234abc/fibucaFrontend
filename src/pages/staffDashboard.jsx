// src/pages/StaffDashboard.jsx
import { useEffect, useState, useCallback, useMemo, useContext } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import DataTable from "react-data-table-component";
import BottomNavbar from "../components/BottomNavbar";
import { DashboardSectionMenuContext } from "../components/DashboardLayout";
import {
  FaDownload,
  FaFilePdf,
  FaLink,
  FaUsers,
  FaChartLine,
  FaClock,
  FaQrcode,
  FaCopy,
  FaPrint,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import ReactDOM from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";

export default function StaffDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const setSectionMenus = useContext(DashboardSectionMenuContext);

  const section = location.pathname.endsWith("/clients")
    ? "clients"
    : location.pathname.endsWith("/profile")
    ? "profile"
    : "links";

  const navbarTabs = [
    { id: "links", label: "Links", icon: FaLink, href: "/staff/links" },
    { id: "clients", label: "Clients", icon: FaUsers, href: "/staff/clients" },
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

  const VITE_FRONTEND_URL =
    import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  const linkUrl = useCallback(
    (token) => `${String(VITE_FRONTEND_URL).replace(/\/$/, "")}/submission/${token}`,
    [VITE_FRONTEND_URL]
  );

  const computeLinkStatus = (row) => {
    const now = new Date();
    const expired = row.expiresAt && new Date(row.expiresAt) < now;
    const used = row.usedCount ?? 0;
    const maxed = row.maxUses && used >= row.maxUses;
    const active = (row.isActive ?? true) && !expired && !maxed;

    return { active, expired, maxed };
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire("Copied", "Link copied to clipboard", "success");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      Swal.fire("Copied", "Link copied to clipboard", "success");
    }
  };

  const printQrPage = (url, meta = {}) => {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      Swal.fire("Blocked", "Popup blocked. Please allow popups to print.", "info");
      return;
    }

    const title = meta.title || "FIBUCA Submission Link";
    const staffName = meta.staffName || "";
    const expiresAt = meta.expiresAt || "";
    const maxUses = meta.maxUses ?? "";
    const usedCount = meta.usedCount ?? "";

    w.document.open();
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Print QR</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .box { max-width: 520px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; padding: 18px; }
            h1 { font-size: 18px; margin: 0 0 10px; }
            .url { word-break: break-all; font-size: 12px; color: #333; margin-top: 12px; }
            .meta { font-size: 12px; color: #444; margin-top: 12px; line-height: 1.5; }
            .qr { display:flex; justify-content:center; margin-top: 14px; }
            .hint { font-size: 12px; color: #666; margin-top: 10px; text-align:center; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>${title}</h1>
            <div class="qr" id="qrRoot"></div>
            <div class="url">${url}</div>
            <div class="meta">
              ${staffName ? `<div><b>Staff:</b> ${staffName}</div>` : ""}
              ${expiresAt ? `<div><b>Expires:</b> ${new Date(expiresAt).toLocaleString()}</div>` : ""}
              ${maxUses !== "" ? `<div><b>Max Uses:</b> ${maxUses || "Unlimited"}</div>` : ""}
              ${usedCount !== "" ? `<div><b>Used:</b> ${usedCount}</div>` : ""}
            </div>
            <div class="hint">Scan QR to open the submission form</div>
          </div>

          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/qrcode.react@3.1.0/dist/index.umd.js"></script>
          <script>
            const root = ReactDOM.createRoot(document.getElementById("qrRoot"));
            const QR = window["qrcode.react"]?.QRCodeSVG || window["qrcode.react"]?.QRCodeCanvas;
            root.render(
              React.createElement(QR, { value: "${url}", size: 220 })
            );
            setTimeout(() => window.print(), 400);
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const showQrModal = (row) => {
    const url = linkUrl(row.token);

    Swal.fire({
      title: "Share Link (QR)",
      html: `
        <div style="display:flex;justify-content:center;margin-top:10px;">
          <div id="qrMount"></div>
        </div>
        <div style="margin-top:12px;font-size:12px;word-break:break-all;color:#333;">
          ${url}
        </div>
        <div style="margin-top:10px;font-size:12px;color:#555;text-align:left;line-height:1.5;">
          <div><b>Expires:</b> ${row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "N/A"}</div>
          <div><b>Max Uses:</b> ${row.maxUses || "Unlimited"}</div>
          <div><b>Used:</b> ${row.usedCount ?? 0}</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Open Link",
      cancelButtonText: "Close",
      showDenyButton: true,
      denyButtonText: "Copy Link",
      showCloseButton: true,
      didOpen: () => {
        const mount = document.getElementById("qrMount");
        if (!mount) return;
        const root = ReactDOM.createRoot(mount);
        root.render(<QRCodeSVG value={url} size={220} />);
      },
      preConfirm: () => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
    }).then((result) => {
      if (result.isDenied) copyToClipboard(url);
    });
  };

  useEffect(() => {
    fetchSubmissions();
    fetchLinks();
  }, []);

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    api
      .get("/api/staff/submissions")
      .then((res) => {
        setSubmissions(res.data || []);
        setFilteredSubs(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchLinks = useCallback(() => {
    api
      .get("/api/staff/links")
      .then((res) => setLinks(res.data || []))
      .catch(console.error);
  }, []);

  const stats = useMemo(() => {
    const activeLinks = links.filter((l) => computeLinkStatus(l).active).length;
    const expiredLinks = links.length - activeLinks;

    return {
      totalClients: submissions.length,
      totalLinks: links.length,
      activeLinks,
      expiredLinks,
    };
  }, [links, submissions]);

  const handleSearch = (value) => {
    if (!value) return setFilteredSubs(submissions);

    const v = value.toLowerCase();
    const results = submissions.filter(
      (s) =>
        (s.employeeName || "").toLowerCase().includes(v) ||
        (s.employeeNumber || "").toLowerCase().includes(v) ||
        (s.employerName || "").toLowerCase().includes(v)
    );

    setFilteredSubs(results);
  };

  const exportToExcel = () => {
    if (!filteredSubs.length) return Swal.fire("No Data", "No records found.", "info");

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
    if (!filteredSubs.length) return Swal.fire("No Data", "No records found.", "info");

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

      Swal.fire(
        "Link Generated",
        `<div style="text-align:left; font-size:13px;">
           <div style="margin-bottom:8px;"><b>Link:</b></div>
           <div style="word-break:break-all">${res.data.link}</div>
           <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
             <button id="btnCopy" class="swal2-confirm swal2-styled" style="background:#2563eb">Copy</button>
             <button id="btnQR" class="swal2-confirm swal2-styled" style="background:#111827">QR</button>
           </div>
         </div>`,
        "success"
      );

      setTimeout(() => {
        const url = res.data.link;
        const btnCopy = document.getElementById("btnCopy");
        const btnQR = document.getElementById("btnQR");
        if (btnCopy) btnCopy.onclick = () => copyToClipboard(url);
        if (btnQR)
          btnQR.onclick = () =>
            showQrModal({
              token: url.split("/submission/")[1],
              expiresAt: res.data.expiresAt,
              maxUses: res.data.maxUses,
              usedCount: 0,
            });
      }, 50);

      fetchLinks();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to generate link.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteLink = async (id, usedCount) => {
    if ((usedCount ?? 0) > 0) return Swal.fire("Locked", "Cannot delete used link.", "info");

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
        const url = linkUrl(row.token);
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-2"
          >
            <span style={{ wordBreak: "break-all" }}>{url}</span>
          </a>
        );
      },
    },

    { name: "Max Uses", selector: (r) => r.maxUses || "Unlimited" },
    { name: "Used", selector: (r) => r.usedCount ?? 0 },

    {
      name: "Status",
      cell: (row) => {
        const { active } = computeLinkStatus(row);
        return active ? (
          <span className="text-green-600 font-semibold">Active</span>
        ) : (
          <span className="text-red-600 font-semibold">Expired</span>
        );
      },
    },

    {
      name: "Share",
      cell: (row) => (
        <div className="flex gap-3 items-center">
          <button
            className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
            onClick={() => showQrModal(row)}
            title="Show QR"
          >
            <FaQrcode /> QR
          </button>

          <button
            className="text-gray-900 hover:underline font-semibold flex items-center gap-1"
            onClick={() =>
              printQrPage(linkUrl(row.token), {
                title: "FIBUCA Submission Link",
                staffName: user?.name,
                expiresAt: row.expiresAt,
                maxUses: row.maxUses,
                usedCount: row.usedCount ?? 0,
              })
            }
            title="Print QR"
          >
            <FaPrint /> Print
          </button>

          <button
            className="text-green-700 hover:underline font-semibold flex items-center gap-1"
            onClick={() => copyToClipboard(linkUrl(row.token))}
            title="Copy Link"
          >
            <FaCopy /> Copy
          </button>
        </div>
      ),
    },

    {
      name: "Delete",
      cell: (row) =>
        (row.usedCount ?? 0) === 0 ? (
          <button
            onClick={() => handleDeleteLink(row.id, row.usedCount ?? 0)}
            className="text-red-600 hover:underline font-semibold"
          >
            Delete
          </button>
        ) : (
          <span className="text-gray-400">Locked</span>
        ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-28 md:pb-0">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>

        <div className="grid md:grid-cols-4 gap-4">
          <StatCard icon={<FaUsers />} label="Clients" value={stats.totalClients} />
          <StatCard icon={<FaLink />} label="Total Links" value={stats.totalLinks} />
          <StatCard icon={<FaChartLine />} label="Active Links" value={stats.activeLinks} />
          <StatCard icon={<FaClock />} label="Expired Links" value={stats.expiredLinks} />
        </div>

        {section === "links" && (
          <>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handleGenerateLink}
                disabled={generating}
                className={`px-4 py-2 rounded text-white ${
                  generating ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Generate Link
              </button>
            </div>

            <div className="bg-white rounded shadow mt-4">
              <DataTable columns={linkColumns} data={links} pagination highlightOnHover responsive />
            </div>
          </>
        )}

        {section === "clients" && (
          <>
            <div className="flex flex-wrap gap-2 mt-4 items-center">
              <input
                placeholder="Search name / number / employer..."
                onChange={(e) => handleSearch(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full md:w-96"
              />

              <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2">
                <FaDownload /> Excel
              </button>
              <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2">
                <FaFilePdf /> PDF
              </button>
            </div>

            <div className="bg-white rounded shadow mt-4">
              <DataTable columns={clientColumns} data={filteredSubs} pagination highlightOnHover responsive />
            </div>
          </>
        )}

        {section === "profile" && (
          <div className="bg-white p-6 rounded shadow mt-4 space-y-2">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>Total Clients Served:</strong> {stats.totalClients}</p>
            <p><strong>Total Links Generated:</strong> {stats.totalLinks}</p>
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