import { useEffect, useMemo, useState } from "react";
import { FaMoneyBillWave, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { api } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

function formatDate(value, isSw) {
  if (!value) return isSw ? "Hakuna" : "Not set";
  return new Date(value).toLocaleDateString();
}

export default function StaffContributions() {
  const { isSw } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/staff/contributions");
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load contributions", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.status === "PAID").length;
    const unpaid = rows.length - paid;
    return { total: rows.length, paid, unpaid };
  }, [rows]);

  if (loading) {
    return <div className="p-6 text-slate-500">{isSw ? "Inapakia michango..." : "Loading contributions..."}</div>;
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{isSw ? "Michango" : "Contributions"}</h2>
        <p className="text-sm text-slate-500">
          {isSw ? "Hii inaonyesha michango yote na hali yako ya malipo." : "This shows all contribution collections and your payment status."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">{isSw ? "Jumla" : "Total"}</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase text-emerald-700">{isSw ? "Zilizolipwa" : "Paid"}</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.paid}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs uppercase text-rose-700">{isSw ? "Hazijalipwa" : "Unpaid"}</p>
          <p className="text-2xl font-bold text-rose-700">{stats.unpaid}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{isSw ? "Jina la Mchango" : "Contribution"}</th>
              <th className="px-4 py-3">{isSw ? "Kiasi" : "Amount"}</th>
              <th className="px-4 py-3">{isSw ? "Mwisho wa Malipo" : "Due Date"}</th>
              <th className="px-4 py-3">{isSw ? "Hali" : "Status"}</th>
              <th className="px-4 py-3">{isSw ? "Tarehe ya Malipo" : "Paid Date"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{Number(item.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(item.dueDate, isSw)}</td>
                <td className="px-4 py-3">
                  {item.status === "PAID" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <FaCheckCircle /> {isSw ? "Imelipwa" : "Paid"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      <FaTimesCircle /> {isSw ? "Haijalipwa" : "Unpaid"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(item.paidAt, isSw)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <FaMoneyBillWave />
                    <span>{isSw ? "Hakuna michango iliyowekwa bado." : "No contributions have been created yet."}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
