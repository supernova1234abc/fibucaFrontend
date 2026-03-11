// src/pages/AdminReports.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import {
  FaChartLine,
  FaBuilding,
  FaCodeBranch,
  FaUsers,
  FaDownload,
  FaFilePdf,
  FaFileExcel,
  FaCalendarAlt,
} from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const PIE_COLORS = [
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

function getLastNMonths(monthCount = 12) {
  const months = [];
  const now = new Date();

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    months.push({ key, label });
  }

  return months;
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function normalizeDues(dues) {
  const raw = String(dues || "").trim().toUpperCase();
  if (!raw) return "UNKNOWN";
  return raw.endsWith("%") ? raw : `${raw}%`;
}

export default function AdminReports() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("12m");

  useEffect(() => {
    setLoading(true);
    api
      .get("/submissions")
      .then((res) => {
        setRawData(res.data || []);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch reports data:", err);
        Swal.fire("Error", "Failed to load reports data", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();

    if (range === "all") return rawData;

    let cutoff = new Date(now);
    if (range === "30d") {
      cutoff.setDate(now.getDate() - 30);
    } else if (range === "90d") {
      cutoff.setDate(now.getDate() - 90);
    } else {
      cutoff.setMonth(now.getMonth() - 12);
    }

    return rawData.filter((r) => {
      const d = new Date(r.submittedAt);
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    });
  }, [rawData, range]);

  const metrics = useMemo(() => {
    const totalSubmissions = filteredData.length;

    const uniqueEmployers = new Set(
      filteredData.map((r) => (r.employerName || "").trim()).filter(Boolean)
    ).size;

    const uniqueBranches = new Set(
      filteredData.map((r) => (r.branchName || "").trim()).filter(Boolean)
    ).size;

    const uniqueClients = new Set(
      filteredData.map((r) => (r.employeeNumber || "").trim()).filter(Boolean)
    ).size;

    return {
      totalSubmissions,
      uniqueEmployers,
      uniqueBranches,
      uniqueClients,
    };
  }, [filteredData]);

  const monthlyTrend = useMemo(() => {
    const months = getLastNMonths(12);
    const map = Object.fromEntries(months.map((m) => [m.key, 0]));

    filteredData.forEach((r) => {
      const d = new Date(r.submittedAt);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 7);
      if (map[key] !== undefined) {
        map[key] += 1;
      }
    });

    return months.map((m) => ({
      name: m.label,
      submissions: map[m.key],
    }));
  }, [filteredData]);

  const topEmployers = useMemo(() => {
    const counts = filteredData.reduce((acc, r) => {
      const key = (r.employerName || "UNKNOWN").trim() || "UNKNOWN";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, submissions]) => ({ name, submissions }))
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, 8);
  }, [filteredData]);

  const topBranches = useMemo(() => {
    const counts = filteredData.reduce((acc, r) => {
      const key = (r.branchName || "UNSPECIFIED").trim() || "UNSPECIFIED";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, submissions]) => ({ name, submissions }))
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, 8);
  }, [filteredData]);

  const duesDistribution = useMemo(() => {
    const counts = filteredData.reduce((acc, r) => {
      const key = normalizeDues(r.dues);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, submissions]) => ({ name, submissions }))
      .sort((a, b) => b.submissions - a.submissions);
  }, [filteredData]);

  const employerShare = useMemo(() => {
    const top = topEmployers.slice(0, 5);
    const topNames = new Set(top.map((x) => x.name));

    const otherCount = topEmployers
      .filter((x) => !topNames.has(x.name))
      .reduce((sum, x) => sum + x.submissions, 0);

    const pie = top.map((item, i) => ({
      ...item,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));

    if (otherCount > 0) {
      pie.push({
        name: "OTHERS",
        submissions: otherCount,
        fill: PIE_COLORS[pie.length % PIE_COLORS.length],
      });
    }

    return pie;
  }, [topEmployers]);

  const recentSubmissions = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 10);
  }, [filteredData]);

  const exportReportPDF = () => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("FIBUCA ADMIN REPORT", 14, 18);

      doc.setFontSize(10);
      doc.text(`Report Range: ${range.toUpperCase()}`, 14, 26);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

      autoTable(doc, {
        startY: 40,
        head: [["Metric", "Value"]],
        body: [
          ["Total Submissions", metrics.totalSubmissions],
          ["Unique Clients", metrics.uniqueClients],
          ["Unique Employers", metrics.uniqueEmployers],
          ["Unique Branches", metrics.uniqueBranches],
        ],
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Top Employers", "Submissions"]],
        body: topEmployers.map((row) => [row.name, row.submissions]),
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Top Branches", "Submissions"]],
        body: topBranches.map((row) => [row.name, row.submissions]),
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Recent Employee", "Number", "Employer", "Branch", "Submitted"]],
        body: recentSubmissions.map((row) => [
          row.employeeName || "-",
          row.employeeNumber || "-",
          row.employerName || "-",
          row.branchName || "-",
          formatDateTime(row.submittedAt),
        ]),
      });

      doc.save("fibuca_admin_report.pdf");
    } catch (err) {
      console.error("❌ PDF export failed:", err);
      Swal.fire("Error", "Failed to export PDF", "error");
    }
  };

  const exportReportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.json_to_sheet([
        { Metric: "Total Submissions", Value: metrics.totalSubmissions },
        { Metric: "Unique Clients", Value: metrics.uniqueClients },
        { Metric: "Unique Employers", Value: metrics.uniqueEmployers },
        { Metric: "Unique Branches", Value: metrics.uniqueBranches },
      ]);

      const submissionsSheet = XLSX.utils.json_to_sheet(
        filteredData.map((row, index) => ({
          SN: index + 1,
          EmployeeName: row.employeeName || "",
          EmployeeNumber: row.employeeNumber || "",
          PhoneNumber: row.phoneNumber || "",
          EmployerName: row.employerName || "",
          BranchName: row.branchName || "",
          Dues: row.dues || "",
          SubmittedAt: formatDateTime(row.submittedAt),
        }))
      );

      const employersSheet = XLSX.utils.json_to_sheet(topEmployers);
      const branchesSheet = XLSX.utils.json_to_sheet(topBranches);
      const duesSheet = XLSX.utils.json_to_sheet(duesDistribution);

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, submissionsSheet, "Submissions");
      XLSX.utils.book_append_sheet(workbook, employersSheet, "Employers");
      XLSX.utils.book_append_sheet(workbook, branchesSheet, "Branches");
      XLSX.utils.book_append_sheet(workbook, duesSheet, "Dues");

      XLSX.writeFile(workbook, "fibuca_admin_report.xlsx");
    } catch (err) {
      console.error("❌ Excel export failed:", err);
      Swal.fire("Error", "Failed to export Excel", "error");
    }
  };

  const cardClass =
    "bg-white rounded-2xl shadow-sm border border-slate-200 p-5";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
            Loading reports...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero header */}
        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-white">
          <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-sky-600 px-6 py-8 md:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-sm mb-3">
                  <FaChartLine />
                  Executive Analytics
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Admin Reports Dashboard
                </h1>
                <p className="text-blue-100 mt-2 max-w-2xl">
                  Monitor submission growth, employer distribution, branch activity,
                  dues patterns and recent operations from one clean reporting page.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
                  <FaCalendarAlt className="text-slate-500" />
                  <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="outline-none bg-transparent text-sm font-medium"
                  >
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="12m">Last 12 months</option>
                    <option value="all">All time</option>
                  </select>
                </div>

                <button
                  onClick={exportReportPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FaFilePdf />
                  PDF
                </button>

                <button
                  onClick={exportReportExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FaFileExcel />
                  Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Total Submissions"
            value={metrics.totalSubmissions}
            icon={<FaChartLine />}
            color="from-blue-600 to-sky-500"
          />
          <MetricCard
            title="Unique Clients"
            value={metrics.uniqueClients}
            icon={<FaUsers />}
            color="from-emerald-600 to-green-500"
          />
          <MetricCard
            title="Unique Employers"
            value={metrics.uniqueEmployers}
            icon={<FaBuilding />}
            color="from-violet-600 to-purple-500"
          />
          <MetricCard
            title="Unique Branches"
            value={metrics.uniqueBranches}
            icon={<FaCodeBranch />}
            color="from-orange-500 to-amber-500"
          />
        </div>

        {/* Main charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`${cardClass} xl:col-span-2`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Submission Trend</h2>
                <p className="text-sm text-slate-500">Monthly movement over the last 12 months</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="submissionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="submissions"
                  stroke="#2563EB"
                  fill="url(#submissionFill)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Employer Share</h2>
                <p className="text-sm text-slate-500">Top employer distribution</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={employerShare}
                  dataKey="submissions"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {employerShare.map((entry, index) => (
                    <Cell key={index} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [val, "Submissions"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Second charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Top Employers</h2>
            <p className="text-sm text-slate-500 mb-4">Highest submission sources</p>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topEmployers} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(val) => [val, "Submissions"]} />
                <Bar dataKey="submissions" radius={[0, 8, 8, 0]} fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={cardClass}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Top Branches</h2>
            <p className="text-sm text-slate-500 mb-4">Most active branch locations</p>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topBranches} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(val) => [val, "Submissions"]} />
                <Bar dataKey="submissions" radius={[0, 8, 8, 0]} fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dues + line chart */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`${cardClass} xl:col-span-1`}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Dues Distribution</h2>
            <p className="text-sm text-slate-500 mb-4">Recorded dues values across submissions</p>

            <div className="space-y-3">
              {duesDistribution.length > 0 ? (
                duesDistribution.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 bg-slate-50"
                  >
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="text-sm font-bold text-blue-700">{item.submissions}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-sm">No dues data available</div>
              )}
            </div>
          </div>

          <div className={`${cardClass} xl:col-span-2`}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Submission Line View</h2>
            <p className="text-sm text-slate-500 mb-4">Clean line visualization for presentations</p>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent submissions table */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Recent Submissions</h2>
              <p className="text-sm text-slate-500">Latest client activity snapshot</p>
            </div>
            <button
              onClick={exportReportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              <FaDownload />
              Export Data
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="text-left py-3 pr-4">Employee</th>
                  <th className="text-left py-3 pr-4">Number</th>
                  <th className="text-left py-3 pr-4">Employer</th>
                  <th className="text-left py-3 pr-4">Branch</th>
                  <th className="text-left py-3 pr-4">Phone</th>
                  <th className="text-left py-3 pr-4">Dues</th>
                  <th className="text-left py-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-800">{row.employeeName || "-"}</td>
                      <td className="py-3 pr-4">{row.employeeNumber || "-"}</td>
                      <td className="py-3 pr-4">{row.employerName || "-"}</td>
                      <td className="py-3 pr-4">{row.branchName || "-"}</td>
                      <td className="py-3 pr-4">{row.phoneNumber || "-"}</td>
                      <td className="py-3 pr-4">{normalizeDues(row.dues)}</td>
                      <td className="py-3">{formatDateTime(row.submittedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      No submissions available for this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-hidden relative">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color}`}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-800">
            {Number(value || 0).toLocaleString()}
          </h3>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}