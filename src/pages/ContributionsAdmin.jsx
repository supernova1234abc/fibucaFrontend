import { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaDownload, FaFilePdf, FaPlus, FaPrint, FaTimesCircle, FaUsers, FaStar, FaCheck, FaTimes } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import { api } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

function asDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function ContributionsAdmin() {
  const { isSw } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [loadingContributors, setLoadingContributors] = useState(false);\n  const [allStaff, setAllStaff] = useState([]);\n  const [selectedStaffIds, setSelectedStaffIds] = useState([]);\n  const [showPublishModal, setShowPublishModal] = useState(false);\n  const [publishForm, setPublishForm] = useState({\n    startDate: \"\",\n    endDate: \"\",\n  });\n  const [publishing, setPublishing] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    dueDate: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/contributions");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch contributions", err);
      Swal.fire("Error", isSw ? "Imeshindikana kupakia michango" : "Failed to load contributions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const total = rows.length;
    const amount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return { total, amount };
  }, [rows]);

  const createContribution = async () => {
    if (!form.title.trim() || !form.amount) {
      return Swal.fire("Error", isSw ? "Weka jina na kiasi" : "Provide title and amount", "error");
    }

    setSaving(true);
    try {
      await api.post("/api/admin/contributions", {
        title: form.title,
        description: form.description,
        amount: Number(form.amount),
        dueDate: form.dueDate || null,
      });
      setForm({ title: "", description: "", amount: "", dueDate: "" });
      await load();
      Swal.fire("Success", isSw ? "Mchango umeongezwa" : "Contribution created", "success");
    } catch (err) {
      Swal.fire("Error", err?.response?.data?.error || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const loadContributors = async (contribution) => {
    setSelected(contribution);
    setLoadingContributors(true);
    try {
      const { data } = await api.get(`/api/admin/contributions/${contribution.id}/contributors`);
      setContributors(Array.isArray(data?.contributors) ? data.contributors : []);
    } catch (err) {
      Swal.fire("Error", err?.response?.data?.error || "Failed", "error");
    } finally {
      setLoadingContributors(false);
    }
  };

  const setPaymentStatus = async (userId, status) => {
    if (!selected) return;
    try {
      await api.put(`/api/admin/contributions/${selected.id}/contributors/${userId}`, {
        status,
      });
      await loadContributors(selected);
      await load();
    } catch (err) {
      Swal.fire("Error", err?.response?.data?.error || "Failed", "error");
    }
  };

  const deleteContribution = async (row) => {
    const ok = await Swal.fire({
      title: isSw ? "Futa mchango?" : "Delete contribution?",
      text: row.title,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;

    try {
      await api.delete(`/api/admin/contributions/${row.id}`);
      if (selected?.id === row.id) {
        setSelected(null);
        setContributors([]);
      }
      await load();
      Swal.fire("Success", isSw ? "Imefutwa" : "Deleted", "success");
    } catch (err) {
      Swal.fire("Error", err?.response?.data?.error || "Failed", "error");
    }
  };

  const exportPdf = () => {
    if (!selected) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${isSw ? "Ripoti ya Mchango" : "Contribution Report"}: ${selected.title}`, 14, 14);
    autoTable(doc, {
      startY: 22,
      head: [["#", isSw ? "Jina" : "Name", isSw ? "Namba" : "Employee #", isSw ? "Hali" : "Status", isSw ? "Tarehe ya malipo" : "Paid date"]],
      body: contributors.map((c, idx) => [
        idx + 1,
        c.name,
        c.employeeNumber || "-",
        c.status,
        c.paidAt ? new Date(c.paidAt).toLocaleString() : "-",
      ]),
    });
    doc.save(`contribution_${selected.id}.pdf`);
  };

  const printContributors = () => {
    if (!selected) return;
    const rowsHtml = contributors.map((c, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${c.name}</td>
        <td>${c.employeeNumber || "-"}</td>
        <td>${c.status}</td>
        <td>${c.paidAt ? new Date(c.paidAt).toLocaleString() : "-"}</td>
      </tr>
    `).join("");

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Contribution</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style></head><body><h2>${selected.title}</h2><table><thead><tr><th>#</th><th>Name</th><th>Employee #</th><th>Status</th><th>Paid date</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{isSw ? "Usimamizi wa Michango" : "Contribution Management"}</h2>
        <p className="text-sm text-slate-500">{isSw ? "Admin/Superadmin huunda mchango na kurekodi malipo ya staff." : "Admin/Superadmin can create collections and record staff payment status."}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">{isSw ? "Jumla ya michango" : "Total contributions"}</p>
          <p className="text-2xl font-bold text-slate-900">{totals.total}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs uppercase text-sky-700">{isSw ? "Jumla ya makadirio" : "Total planned amount"}</p>
          <p className="text-2xl font-bold text-sky-700">{totals.amount.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded border border-slate-300 px-3 py-2" placeholder={isSw ? "Jina la mchango" : "Contribution title"} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder={isSw ? "Kiasi" : "Amount"} type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
          <button disabled={saving} onClick={createContribution} className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            <FaPlus /> {saving ? (isSw ? "Inahifadhi..." : "Saving...") : (isSw ? "Ongeza" : "Add")}
          </button>
        </div>
        <textarea className="mt-3 w-full rounded border border-slate-300 px-3 py-2" rows={2} placeholder={isSw ? "Maelezo (si lazima)" : "Description (optional)"} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{isSw ? "Mchango" : "Contribution"}</th>
                <th className="px-4 py-3">{isSw ? "Kiasi" : "Amount"}</th>
                <th className="px-4 py-3">{isSw ? "Mwisho" : "Due"}</th>
                <th className="px-4 py-3">{isSw ? "Hatua" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-500">{row.paidCount || 0}/{row.staffCount || 0} {isSw ? "wamelipa" : "paid"}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{Number(row.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{asDate(row.dueDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => loadContributors(row)} className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1.5 text-xs text-white hover:bg-black"><FaUsers /> {isSw ? "Wachangiaji" : "Contributors"}</button>
                      <button onClick={() => deleteContribution(row)} className="rounded bg-rose-600 px-2.5 py-1.5 text-xs text-white hover:bg-rose-700">{isSw ? "Futa" : "Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">{isSw ? "Hakuna michango bado." : "No contributions yet."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {!selected ? (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-slate-500">
              {isSw ? "Chagua mchango kuona wachangiaji na hali za malipo." : "Select a contribution to view contributors and payment statuses."}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selected.title}</h3>
                  <p className="text-xs text-slate-500">{selected.description || (isSw ? "Hakuna maelezo" : "No description")}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportPdf} className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"><FaFilePdf /> PDF</button>
                  <button onClick={printContributors} className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"><FaPrint /> {isSw ? "Chapisha" : "Print"}</button>
                </div>
              </div>

              <div className="max-h-[430px] overflow-auto rounded border border-slate-200">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">{isSw ? "Jina" : "Name"}</th>
                      <th className="px-3 py-2">{isSw ? "Namba" : "Employee #"}</th>
                      <th className="px-3 py-2">{isSw ? "Hali" : "Status"}</th>
                      <th className="px-3 py-2">{isSw ? "Hatua" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingContributors ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">{isSw ? "Inapakia..." : "Loading..."}</td></tr>
                    ) : contributors.map((c, idx) => (
                      <tr key={c.userId} className="border-t border-slate-100">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{c.name}</td>
                        <td className="px-3 py-2">{c.employeeNumber || "-"}</td>
                        <td className="px-3 py-2">
                          {c.status === "PAID" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"><FaCheckCircle /> {isSw ? "Imelipwa" : "Paid"}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700"><FaTimesCircle /> {isSw ? "Haijalipwa" : "Unpaid"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => setPaymentStatus(c.userId, "PAID")} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700">{isSw ? "Weka imelipwa" : "Mark paid"}</button>
                            <button onClick={() => setPaymentStatus(c.userId, "UNPAID")} className="rounded bg-slate-600 px-2 py-1 text-xs text-white hover:bg-slate-700">{isSw ? "Rudisha hajalipa" : "Mark unpaid"}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
