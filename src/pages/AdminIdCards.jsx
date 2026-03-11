// src/pages/AdminIdCards.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import {
  FaSearch,
  FaIdCard,
  FaEye,
  FaDownload,
  FaSyncAlt,
} from "react-icons/fa";
import BottomNavbar from "../components/BottomNavbar";
import { api, setAuthToken } from "../lib/api";
import IDCard from "../components/IDCard";

export default function AdminIdCards() {
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);

  const previewRef = useRef(null);

  const navbarTabs = [
    { id: "submissions", label: "Submissions", icon: FaIdCard, href: "/admin/submissions" },
    { id: "users", label: "Users", icon: FaIdCard, href: "/admin/users" },
    { id: "leaderboard", label: "Leaderboard", icon: FaIdCard, href: "/admin/leaderboard" },
    { id: "reports", label: "Reports", icon: FaIdCard, href: "/admin/reports" },
    { id: "idcards", label: "ID Cards", icon: FaIdCard, href: "/admin/idcards" },
  ];

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/idcards");
      const rows = res.data || [];
      setCards(rows);
      setFilteredCards(rows);
    } catch (err) {
      console.error("❌ Failed to fetch id cards:", err);
      Swal.fire("Error", "Failed to fetch ID cards", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      localStorage.getItem("fibuca_token") ||
      sessionStorage.getItem("fibuca_token");

    if (token) setAuthToken(token);
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      setFilteredCards(cards);
      return;
    }

    const next = cards.filter((card) => {
      return (
        (card.fullName || "").toLowerCase().includes(q) ||
        (card.cardNumber || "").toLowerCase().includes(q) ||
        (card.company || "").toLowerCase().includes(q) ||
        (card.role || "").toLowerCase().includes(q) ||
        (card.user?.employeeNumber || "").toLowerCase().includes(q) ||
        (card.user?.name || "").toLowerCase().includes(q) ||
        (card.user?.email || "").toLowerCase().includes(q)
      );
    });

    setFilteredCards(next);
  }, [query, cards]);

  const stats = useMemo(() => {
    const total = cards.length;
    const withCleanPhoto = cards.filter((c) => !!c.cleanPhotoUrl).length;
    const withRawPhoto = cards.filter((c) => !!c.rawPhotoUrl).length;
    const uniqueCompanies = new Set(cards.map((c) => c.company).filter(Boolean)).size;

    return { total, withCleanPhoto, withRawPhoto, uniqueCompanies };
  }, [cards]);

  const columns = [
    {
      name: "#",
      selector: (row, index) => index + 1,
      width: "60px",
    },
    {
      name: "Card Number",
      selector: (row) => row.cardNumber || "-",
      sortable: true,
      wrap: true,
    },
    {
      name: "Full Name",
      selector: (row) => row.fullName || row.user?.name || "-",
      sortable: true,
      wrap: true,
    },
    {
      name: "Employee #",
      selector: (row) => row.user?.employeeNumber || "-",
      wrap: true,
    },
    {
      name: "Company",
      selector: (row) => row.company || "-",
      sortable: true,
      wrap: true,
    },
    {
      name: "Role",
      selector: (row) => row.role || "-",
      wrap: true,
    },
    {
      name: "Issued",
      selector: (row) =>
        row.issuedAt ? new Date(row.issuedAt).toLocaleDateString() : "-",
      sortable: true,
      wrap: true,
    },
    {
      name: "Photo",
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            row.cleanPhotoUrl
              ? "bg-green-100 text-green-700"
              : row.rawPhotoUrl
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {row.cleanPhotoUrl ? "Cleaned" : row.rawPhotoUrl ? "Raw Only" : "No Photo"}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCard(row)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            title="Preview card"
          >
            <FaEye />
          </button>

          <button
            onClick={() => {
              setSelectedCard(row);
              setTimeout(() => {
                const btn = document.getElementById("admin-idcard-print-btn");
                if (btn) btn.click();
              }, 200);
            }}
            className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            title="Generate / download PDF"
          >
            <FaDownload />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-28 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-white">
          <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-sky-600 px-6 py-8 md:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-sm mb-3">
                  <FaIdCard />
                  Identity Registry
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Generated ID Cards
                </h1>
                <p className="text-blue-100 mt-2 max-w-2xl">
                  Search, preview, and download generated identity cards for printing
                  and record management.
                </p>
              </div>

              <button
                onClick={fetchCards}
                className="bg-white text-blue-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-50"
              >
                <FaSyncAlt />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Cards" value={stats.total} />
          <StatCard title="With Clean Photo" value={stats.withCleanPhoto} />
          <StatCard title="With Raw Photo" value={stats.withRawPhoto} />
          <StatCard title="Companies Covered" value={stats.uniqueCompanies} />
        </div>

        {/* search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="relative w-full md:w-[420px]">
            <FaSearch className="absolute top-3.5 left-3 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, card number, employee number, company..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredCards}
            pagination
            progressPending={loading}
            highlightOnHover
            responsive
            striped
            persistTableHead
          />
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto relative p-4 md:p-6">
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
            >
              ✕
            </button>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800">ID Card Preview</h2>
              <p className="text-sm text-slate-500">
                Preview the generated card and download the PDF for printing.
              </p>
            </div>

            <div ref={previewRef}>
              <IDCard ref={previewRef} card={selectedCard} />
            </div>

            {/* hidden helper button to trigger existing handlePrint */}
            <button
              id="admin-idcard-print-btn"
              onClick={() => {
                const printBtn = document.querySelector("button.print\\:hidden, button.bg-blue-700, button.bg-blue-600");
                if (printBtn) printBtn.click();
              }}
              className="hidden"
            >
              hidden print
            </button>
          </div>
        </div>
      )}

      <BottomNavbar tabs={navbarTabs} />
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-800">
        {Number(value || 0).toLocaleString()}
      </h3>
    </div>
  );
}