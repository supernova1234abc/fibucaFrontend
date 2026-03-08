// src/pages/ClientDashboard.jsx
import React, { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChangePwModalContext } from "../components/DashboardLayout";
import { FaFilePdf, FaRedo, FaLock, FaRegCommentDots, FaExchangeAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import IDCard from "../components/IDCard";

export default function ClientDashboard() {
  const openChangePwModal = useContext(ChangePwModalContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [idCards, setIdCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);

  // ✅ complaints
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintMessage, setComplaintMessage] = useState("");
  const [sendingComplaint, setSendingComplaint] = useState(false);

  // ✅ transfer request (client-side request)
  const [transferEmployer, setTransferEmployer] = useState("");
  const [transferNewEmpNo, setTransferNewEmpNo] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [sendingTransfer, setSendingTransfer] = useState(false);

  // ---------------------- FETCH FUNCTIONS ----------------------
  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    setLoadingSubmission(true);
    try {
      const res = await api.get("/submissions");
      const data = Array.isArray(res.data) ? res.data : [];
      const mine = data
        .filter((s) => s.employeeNumber === user.employeeNumber)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      let latest = mine[0] || null;

      // Handle pdfPath URL
      if (latest?.pdfPath && !latest.pdfPath.startsWith("http")) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        latest.pdfPath = `${backendUrl.replace(/\/$/, "")}/${latest.pdfPath.replace(/^\/+/, "")}`;
      } else {
        const cached = localStorage.getItem("latestSubmission");
        if (cached) {
          const cachedData = JSON.parse(cached);
          if (cachedData?.employeeNumber === user?.employeeNumber) {
            latest = cachedData;
          }
        }
      }

      setSubmission(latest);
      if (latest) localStorage.setItem("latestSubmission", JSON.stringify(latest));
    } catch (err) {
      console.error("Error fetching submission:", err);
      setSubmission(null);
    } finally {
      setLoadingSubmission(false);
    }
  }, [user]);

  const fetchIdCards = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCards(true);
    try {
      const { data } = await api.get(`/api/idcards/${user.id}`);
      const cards = Array.isArray(data) ? data : [];
      setIdCards(cards);
    } catch (err) {
      console.warn("Fetch ID cards failed:", err);
      setIdCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, [user]);

  const fetchMyComplaints = useCallback(async () => {
    if (!user) return;
    setLoadingComplaints(true);
    try {
      const { data } = await api.get("/api/complaints/mine");
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Fetch complaints failed:", err);
      setComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role !== "CLIENT") navigate("/login");
    fetchSubmissions();
    fetchIdCards();
    fetchMyComplaints();
  }, [user, navigate, fetchSubmissions, fetchIdCards, fetchMyComplaints]);

  // ---------------------- IMAGE UPLOAD ----------------------
  const handleFileUpload = async (file) => {
    if (!file) return;
    const card = idCards[0];
    if (!card) return toast.error("No placeholder ID card found.");

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("photo", file, file.name);

      const uploadResp = await api.put(`/api/idcards/${card.id}/photo`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setCleanProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });

      const updated = uploadResp.data.card;
      setIdCards([updated]);
      toast.success("✅ Photo uploaded and background removed.");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Photo upload/clean failed.");
    } finally {
      setUploadingPhoto(false);
      setCleanProgress(0);
    }
  };

  const handleReClean = async (cardId) => {
    setIsCleaning(true);
    setCleanProgress(0);
    try {
      const interval = setInterval(
        () =>
          setCleanProgress((p) =>
            p >= 100 ? (clearInterval(interval), 100) : p + 20
          ),
        300
      );

      await api.put(`/api/idcards/${cardId}/clean-photo`);
      await fetchIdCards();
      toast.success("Photo re-cleaned!");
    } catch (err) {
      console.error(err);
      toast.error("Re-clean failed.");
    } finally {
      setIsCleaning(false);
      setCleanProgress(0);
    }
  };

  // ---------------------- PDF DOWNLOAD ----------------------
  const downloadPdf = async (url, filenameFallback) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filenameFallback || "form.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Download failed — opening in a new tab");
      window.open(url, "_blank", "noopener");
    }
  };

  // ---------------------- SUPPORT ACTIONS ----------------------
  const submitComplaint = async () => {
    const subject = complaintSubject.trim();
    const message = complaintMessage.trim();

    if (!subject || !message) return toast.error("Subject and message are required.");

    setSendingComplaint(true);
    try {
      await api.post("/api/complaints", { subject, message });
      toast.success("✅ Complaint sent");
      setComplaintSubject("");
      setComplaintMessage("");
      fetchMyComplaints();
    } catch (err) {
      console.error("Complaint submit failed:", err);
      toast.error("Failed to send complaint");
    } finally {
      setSendingComplaint(false);
    }
  };

  // Client-side transfer request (stored as a complaint)
  const submitTransferRequest = async () => {
    const newEmpNo = transferNewEmpNo.trim();
    const newEmployer = transferEmployer.trim();
    const note = transferNote.trim();

    if (!newEmpNo || !newEmployer) {
      return toast.error("New employer name and new employee number are required.");
    }

    setSendingTransfer(true);
    try {
      const subject = "TRANSFER REQUEST";
      const message =
        `Client requests transfer/update details:\n` +
        `Old Employee Number: ${user.employeeNumber}\n` +
        `New Employee Number: ${newEmpNo}\n` +
        `New Employer/Bank: ${newEmployer}\n` +
        (note ? `Reason/Note: ${note}\n` : "");

      await api.post("/api/complaints", { subject, message });

      toast.success("✅ Transfer request sent to staff");
      setTransferEmployer("");
      setTransferNewEmpNo("");
      setTransferNote("");
      fetchMyComplaints();
    } catch (err) {
      console.error("Transfer request failed:", err);
      toast.error("Failed to send transfer request");
    } finally {
      setSendingTransfer(false);
    }
  };

  // ---------------------- UI CONTROL ----------------------
  const section = location.pathname.endsWith("/pdf")
    ? "pdf"
    : location.pathname.endsWith("/idcards")
      ? "idcards"
      : location.pathname.endsWith("/generate")
        ? "generate"
        : location.pathname.endsWith("/support")
          ? "support"
          : "overview";

  const getCardRole = () => "Member";

  const latestCard = useMemo(() => (idCards?.length ? idCards[0] : null), [idCards]);

  // ---------------------- RENDER ----------------------
  return (
    <div className="space-y-6">
      {/* Overview */}
      {section === "overview" && (
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Hello, {user.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Last Submission</h3>
              <p className="text-gray-600">
                {loadingSubmission
                  ? "Loading…"
                  : submission
                    ? new Date(submission.submittedAt).toLocaleDateString()
                    : "None"}
              </p>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">ID Cards Created</h3>
              <p className="text-gray-600">{loadingCards ? "Loading…" : idCards.length}</p>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Role / Title</h3>
              <p className="text-gray-600">{getCardRole()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => navigate("/client/support")}
              className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              <FaRegCommentDots className="mr-2" /> Complaints / Support
            </button>

            <button
              onClick={() => navigate("/client/support")}
              className="inline-flex items-center px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-800"
            >
              <FaExchangeAlt className="mr-2" /> Transfer Request
            </button>
          </div>
        </div>
      )}

      {/* PDF Section */}
      {section === "pdf" && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Your Generated PDF Form</h2>
          {submission?.pdfPath ? (
            <button
              onClick={() =>
                downloadPdf(
                  submission.pdfPath,
                  submission.originalFilename || `form_${user.employeeNumber}.pdf`
                )
              }
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              <FaFilePdf className="mr-2" /> Download Form
            </button>
          ) : (
            <p className="text-gray-500">You haven’t generated your form PDF yet.</p>
          )}
        </div>
      )}

      {/* ID Cards */}
      {section === "idcards" && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-4">Your ID Cards</h2>
          {loadingCards ? (
            <p className="text-gray-500">Loading…</p>
          ) : idCards.length === 0 ? (
            <p className="text-gray-500">No ID cards found.</p>
          ) : (
            <div className="space-y-8">
              {idCards.map((card) => (
                <div key={card.id}>
                  <IDCard card={card} />
                  {card.rawPhotoUrl && (
                    <button
                      onClick={() => handleReClean(card.id)}
                      disabled={isCleaning}
                      className={`mt-2 px-3 py-1 rounded text-white ${isCleaning ? "bg-gray-400" : "bg-yellow-600 hover:bg-yellow-700"
                        }`}
                    >
                      <FaRedo className="inline mr-1" /> Re-clean Photo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isCleaning && (
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${cleanProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Generate / Upload photo */}
      {section === "generate" && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4">Add Your Photo</h2>

          {loadingCards ? (
            <p className="text-gray-500">Loading placeholder card…</p>
          ) : idCards.length === 0 ? (
            <p className="text-red-500">You need a placeholder card first.</p>
          ) : (
            <>
              <div className="mb-4 space-y-1">
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Company:</strong> {latestCard?.company || submission?.employerName || "N/A"}
                </p>
                <p>
                  <strong>Role / Title:</strong> {getCardRole()}
                </p>
                <p>
                  <strong>Card #:</strong> {latestCard?.cardNumber}
                </p>
              </div>

              <div className="mb-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  disabled={uploadingPhoto || isCleaning}
                  className="block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer focus:outline-none"
                />
              </div>

              {uploadingPhoto && (
                <p className="text-blue-600 mt-2 font-semibold">Uploading / processing…</p>
              )}

              {isCleaning && (
                <div className="mt-2">
                  <p className="text-yellow-600 font-semibold">Cleaning photo… {cleanProgress}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${cleanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {latestCard?.cleanPhotoUrl && (
                <div className="mt-4">
                  <p className="font-semibold">Latest Photo:</p>
                  <img
                    src={latestCard.cleanPhotoUrl}
                    alt="photo-preview"
                    className="w-48 h-48 object-cover rounded shadow"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ✅ Support: Complaints + Transfer Request */}
      {section === "support" && (
        <div className="space-y-6">
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center">
              <FaRegCommentDots className="mr-2" /> Complaints / Support
            </h2>

            <div className="space-y-3">
              <input
                value={complaintSubject}
                onChange={(e) => setComplaintSubject(e.target.value)}
                placeholder="Subject / Head"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
              />
              <textarea
                value={complaintMessage}
                onChange={(e) => setComplaintMessage(e.target.value)}
                placeholder="Write your complaint/message..."
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
              />
              <button
                onClick={submitComplaint}
                disabled={sendingComplaint}
                className={`px-4 py-2 rounded text-white ${sendingComplaint ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                Send Complaint
              </button>
            </div>
          </div>

          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center">
              <FaExchangeAlt className="mr-2" /> Transfer Request (Bank / Employer Change)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">New Employer / Bank</label>
                <input
                  value={transferEmployer}
                  onChange={(e) => setTransferEmployer(e.target.value)}
                  placeholder="e.g. CRDB Bank"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">New Employee Number</label>
                <input
                  value={transferNewEmpNo}
                  onChange={(e) => setTransferNewEmpNo(e.target.value)}
                  placeholder="New employee number"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Reason / Note (optional)</label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  rows={3}
                  placeholder="Explain why you are changing bank/employer..."
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                />
              </div>
            </div>

            <button
              onClick={submitTransferRequest}
              disabled={sendingTransfer}
              className={`mt-3 px-4 py-2 rounded text-white ${sendingTransfer ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
                }`}
            >
              Submit Transfer Request
            </button>

            <p className="text-xs text-gray-500 mt-2">
              Note: Staff must approve the transfer before your employee number changes in the system.
            </p>
          </div>

<div className="bg-white rounded shadow p-6">
  <h3 className="font-semibold mb-2">My Requests / Complaints</h3>

  {loadingComplaints ? (
    <p className="text-gray-500">Loading…</p>
  ) : complaints.length === 0 ? (
    <p className="text-gray-500">No complaints yet.</p>
  ) : (
    <div className="space-y-2">
      {complaints.map((c) => (
        <div key={c.id} className="border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{c.subject}</p>
            <span
              className={`text-xs px-2 py-1 rounded ${
                c.status === "OPEN"
                  ? "bg-yellow-100 text-yellow-800"
                  : c.status === "RESOLVED"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {c.status}
            </span>
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
            {c.message}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            {new Date(c.createdAt).toLocaleString()}
          </p>

          {c.replies?.length > 0 && (
            <div className="mt-3 space-y-2">
              {c.replies.map((r) => (
                <div
                  key={r.id}
                  className="bg-blue-50 border-l-4 border-blue-500 rounded p-3"
                >
                  <p className="text-sm font-semibold text-blue-900">
                    {r.sender?.name} ({r.sender?.role})
                  </p>
                  <p className="text-xs text-gray-500 mb-1">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {r.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
        </div>
      )}

      {/* Password Notice */}
      <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-md flex items-center mt-6">
        <FaLock className="mr-2" />
        <span>
          If you haven’t changed your password,{" "}
          <button
            onClick={() => openChangePwModal(true)}
            className="underline font-semibold text-blue-600"
          >
            click here
          </button>
          .
        </span>
      </div>
    </div>
  );
}