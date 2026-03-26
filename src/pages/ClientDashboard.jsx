// src/pages/ClientDashboard.jsx
import React, { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChangePwModalContext } from "../components/DashboardLayout";
import { FaFilePdf, FaRedo, FaLock, FaRegCommentDots, FaExchangeAlt, FaBullhorn, FaFileAlt, FaPaperclip, FaCamera } from "react-icons/fa";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import IDCard from "../components/IDCard";
import { useLanguage } from "../context/LanguageContext";

function parseReplyContent(raw = "") {
  const lines = String(raw || "").split(/\r?\n/);
  let attachmentFileUrl = "";
  let attachmentLinkUrl = "";
  let editedAt = "";
  let deletedAt = "";
  let deleted = false;
  const cleanLines = [];

  lines.forEach((line) => {
    if (line.startsWith("__ATTACHMENT_FILE__:")) {
      attachmentFileUrl = line.replace("__ATTACHMENT_FILE__:", "").trim();
      return;
    }
    if (line.startsWith("__ATTACHMENT_LINK__:")) {
      attachmentLinkUrl = line.replace("__ATTACHMENT_LINK__:", "").trim();
      return;
    }
    if (line.startsWith("__EDITED_AT__:")) {
      editedAt = line.replace("__EDITED_AT__:", "").trim();
      return;
    }
    if (line.startsWith("__DELETED__:")) {
      deleted = line.replace("__DELETED__:", "").trim() === "true";
      return;
    }
    if (line.startsWith("__DELETED_AT__:")) {
      deletedAt = line.replace("__DELETED_AT__:", "").trim();
      return;
    }
    cleanLines.push(line);
  });

  return {
    message: cleanLines.join("\n").trim(),
    attachmentFileUrl,
    attachmentLinkUrl,
    editedAt,
    deleted,
    deletedAt,
  };
}

function complaintHasAttachment(complaint) {
  return Array.isArray(complaint?.replies) && complaint.replies.some((reply) => {
    const parsed = parseReplyContent(reply?.message || "");
    return !!parsed.attachmentFileUrl || !!parsed.attachmentLinkUrl;
  });
}

function complaintHasUnread(complaint) {
  return !!complaint?.unreadForClient;
}

export default function ClientDashboard() {
  const openChangePwModal = useContext(ChangePwModalContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const { isSw } = useLanguage();

  const [submission, setSubmission] = useState(() => {
    // Pre-seed from cache so the PDF button is visible immediately on mount
    try {
      const raw = localStorage.getItem("latestSubmission");
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  });
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [idCards, setIdCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [browserCleaning, setBrowserCleaning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [photoRuntime, setPhotoRuntime] = useState({
    photoMode: "cloudinary",
    isVercel: false,
    preferClientBgRemoval: true,
  });

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
  const [transferMode, setTransferMode] = useState("EMPLOYER_CHANGE");
  const [transferNewBranch, setTransferNewBranch] = useState("");
  const [transferWorkstation, setTransferWorkstation] = useState("");

  const [officialDocuments, setOfficialDocuments] = useState([]);
  const [officialUpdates, setOfficialUpdates] = useState([]);
  const [loadingOfficial, setLoadingOfficial] = useState(false);


  // ---------------------- FETCH FUNCTIONS ----------------------
  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    setLoadingSubmission(true);
    try {
      const res = await api.get("/submissions");
      // Backend already filters by employeeNumber for CLIENT role
      const data = Array.isArray(res.data) ? res.data : [];
      const sorted = data.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      let latest = sorted[0] || null;

      // Resolve relative pdfPath to absolute
      if (latest?.pdfPath && !latest.pdfPath.startsWith("http")) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        latest = { ...latest, pdfPath: `${backendUrl.replace(/\/$/, "")}/${latest.pdfPath.replace(/^\/+/, "")}` };
      }

      // If we still have no pdfPath, try the localStorage cache for this user
      if (!latest?.pdfPath) {
        try {
          const cached = localStorage.getItem("latestSubmission");
          if (cached) {
            const cachedData = JSON.parse(cached);
            if (cachedData?.employeeNumber === user?.employeeNumber && cachedData?.pdfPath) {
              latest = latest ? { ...latest, pdfPath: cachedData.pdfPath } : cachedData;
            }
          }
        } catch (_) {}
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

  const fetchPhotoRuntime = useCallback(async () => {
    try {
      const { data } = await api.get("/api/photo-mode");
      if (data && typeof data === "object") {
        setPhotoRuntime((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.warn("Photo runtime mode fetch failed, using defaults:", err?.message || err);
    }
  }, []);

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

  const markAllMyComplaintsRead = async () => {
    try {
      await api.post("/api/complaints/mark-read");
      setComplaints((prev) => prev.map((c) => ({ ...c, unreadForClient: false })));
      toast.success(isSw ? "Ujumbe wote umewekwa kuwa umesomwa" : "All messages marked as read");
    } catch (err) {
      console.error(err);
      toast.error(isSw ? "Imeshindikana kuweka kama umesomwa" : "Failed to mark as read");
    }
  };

  const fetchOfficialInfo = useCallback(async () => {
    setLoadingOfficial(true);
    try {
      const [docsRes, updatesRes] = await Promise.all([
        api.get("/api/client/documents"),
        api.get("/api/client/updates"),
      ]);
      setOfficialDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
      setOfficialUpdates(Array.isArray(updatesRes.data) ? updatesRes.data : []);
    } catch (err) {
      console.warn("Fetch official info failed:", err);
      setOfficialDocuments([]);
      setOfficialUpdates([]);
    } finally {
      setLoadingOfficial(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== "CLIENT") navigate("/login");
    fetchSubmissions();
    fetchIdCards();
    fetchMyComplaints();
    fetchPhotoRuntime();
    fetchOfficialInfo();
  }, [user, navigate, fetchSubmissions, fetchIdCards, fetchMyComplaints, fetchPhotoRuntime, fetchOfficialInfo]);

  const removeBackgroundInBrowser = useCallback(async (file) => {
    const { removeBackground } = await import("@imgly/background-removal");
    const cleanedBlob = await removeBackground(file);
    const nextName = `${file.name.replace(/\.[^.]+$/, "")}_clean.png`;
    return new File([cleanedBlob], nextName, { type: "image/png" });
  }, []);

  // ---------------------- IMAGE UPLOAD ----------------------
  const handleFileUpload = async (file) => {
    if (!file) return;
    const card = idCards[0];
    if (!card) return toast.error(isSw ? "Hakuna kadi ya mwanzo iliyopatikana." : "No placeholder ID card found.");

    // Client one-time restriction check (server enforces too, but give instant feedback)
    if (user?.role === "CLIENT" && card.rawPhotoUrl) {
      return toast.error(isSw ? "Umeshaseti picha. Wasiliana na staff kufanya mabadiliko." : "You already uploaded your photo. Contact staff to update it.");
    }

    setUploadingPhoto(true);
    setCleanProgress(0);
    try {
      let uploadFile = file;
      let clientCleaned = false;

      if (photoRuntime.preferClientBgRemoval) {
        setBrowserCleaning(true);
        setIsCleaning(true);
        setCleanProgress(8);
        try {
          uploadFile = await removeBackgroundInBrowser(file);
          clientCleaned = true;
          setCleanProgress(58);
          toast.success(isSw ? "Mandharinyuma yameondolewa kwenye kivinjari." : "Background removed in browser.");
        } catch (cleanErr) {
          const isMemoryError = cleanErr?.message?.toLowerCase().includes("memory") || cleanErr?.message?.toLowerCase().includes("wasm");
          const fallbackMsg = isMemoryError
            ? (isSw ? "Kivinjari hana uwezo wa kutosha, tunaendelea bila usafishaji." : "Browser lacks memory for cleaning, uploading without it.")
            : (isSw ? "Usafishaji wa kivinjari umeshindikana, tunatumia seva." : "Browser clean failed, using server fallback.");
          console.warn("Browser background removal failed:", cleanErr);
          toast(fallbackMsg, { icon: "⚠️" });
          // uploadFile stays as original — server will handle
        } finally {
          setBrowserCleaning(false);
          setIsCleaning(false);
        }
      }

      const fd = new FormData();
      fd.append("photo", uploadFile, uploadFile.name);

      const uploadResp = await api.put(`/api/idcards/${card.id}/photo`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(clientCleaned ? { "X-Photo-Cleaned": "1" } : {}),
        },
        onUploadProgress: (ev) => {
          if (ev.total) {
            const base = clientCleaned ? 58 : 0;
            const pct = Math.round((ev.loaded / ev.total) * (clientCleaned ? 42 : 100));
            setCleanProgress(base + pct);
          }
        },
      });

      const updated = uploadResp.data?.card || uploadResp.data;
      setIdCards(updated ? [updated] : idCards);
      // Refresh auth user so avatar immediately shows the new ID card photo
      await refreshUser().catch(() => {});
      toast.success(clientCleaned
        ? (isSw ? "Picha imesafishwa kwenye kivinjari na kupakiwa." : "Photo cleaned in browser and uploaded.")
        : (isSw ? "Picha imepakiwa na kuchakatwa kwenye seva." : "Photo uploaded and processed on server."));
    } catch (err) {
      console.error("Error uploading photo:", err);
      const serverMsg = err?.response?.data?.error;
      toast.error(serverMsg || (isSw ? "Kupakia au kusafisha picha kumeshindikana." : "Photo upload/clean failed."));
    } finally {
      setUploadingPhoto(false);
      setBrowserCleaning(false);
      setIsCleaning(false);
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
      toast.success(isSw ? "Picha imesafishwa tena!" : "Photo re-cleaned!");
    } catch (err) {
      console.error(err);
      toast.error(isSw ? "Usafishaji wa pili umeshindikana." : "Re-clean failed.");
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
      toast.error(isSw ? "Upakuaji umeshindikana, tunafungua kwenye tab mpya" : "Download failed - opening in a new tab");
      window.open(url, "_blank", "noopener");
    }
  };

  // ---------------------- SUPPORT ACTIONS ----------------------
  const submitComplaint = async () => {
    const subject = complaintSubject.trim();
    const message = complaintMessage.trim();

    if (!subject || !message) return toast.error(isSw ? "Kichwa na ujumbe vinahitajika." : "Subject and message are required.");

    setSendingComplaint(true);
    try {
      await api.post("/api/complaints", { subject, message });
      toast.success(isSw ? "Malalamiko yametumwa" : "Complaint sent");
      setComplaintSubject("");
      setComplaintMessage("");
      fetchMyComplaints();
    } catch (err) {
      console.error("Complaint submit failed:", err);
      toast.error(isSw ? "Imeshindikana kutuma malalamiko" : "Failed to send complaint");
    } finally {
      setSendingComplaint(false);
    }
  };

  // Client-side transfer request (stored as a complaint)
  const submitTransferRequest = async () => {
    const newEmpNo = transferNewEmpNo.trim();
    const newEmployer = transferEmployer.trim();
    const newBranch = transferNewBranch.trim();
    const workstation = transferWorkstation.trim();
    const note = transferNote.trim();

    if (!newBranch) {
      return toast.error(isSw ? "Tawi au kituo kipya cha kazi kinahitajika." : "New branch/workstation is required.");
    }

    if (transferMode === "EMPLOYER_CHANGE" && (!newEmpNo || !newEmployer)) {
      return toast.error(isSw ? "Mwajiri mpya na namba mpya ya mwajiriwa vinahitajika." : "New employer and new employee number are required.");
    }

    setSendingTransfer(true);
    try {
      const subject = "TRANSFER NOTICE";
      const message =
        `Client transfer notice:\n` +
        `Transfer Type: ${transferMode === "EMPLOYER_CHANGE" ? "Employer change" : "Branch only"}\n` +
        `Old Employee Number: ${user.employeeNumber}\n` +
        `New Employee Number: ${transferMode === "EMPLOYER_CHANGE" ? newEmpNo : user.employeeNumber}\n` +
        `New Employer/Bank: ${transferMode === "EMPLOYER_CHANGE" ? newEmployer : "No change"}\n` +
        `New Branch: ${newBranch}\n` +
        `New Workstation: ${workstation || "N/A"}\n` +
        (note ? `Reason/Note: ${note}\n` : "");

      await api.post("/api/complaints", { subject, message });

      toast.success(isSw ? "Ombi la uhamisho limetumwa kwa staff" : "Transfer request sent to staff");
      setTransferEmployer("");
      setTransferNewEmpNo("");
      setTransferNewBranch("");
      setTransferWorkstation("");
      setTransferNote("");
      fetchMyComplaints();
    } catch (err) {
      console.error("Transfer request failed:", err);
      toast.error(isSw ? "Imeshindikana kutuma ombi la uhamisho" : "Failed to send transfer request");
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
        : location.pathname.endsWith("/documents")
          ? "documents"
          : location.pathname.endsWith("/updates")
            ? "updates"
        : location.pathname.endsWith("/support/complaints")
          ? "support-complaints"
          : location.pathname.endsWith("/support/transfer")
            ? "support-transfer"
            : "overview";

  const getCardRole = () => "Member";

  const latestCard = useMemo(() => (idCards?.length ? idCards[0] : null), [idCards]);
  const transferRequests = useMemo(
    () => complaints.filter((c) => String(c?.subject || "").trim().toUpperCase() === "TRANSFER NOTICE"),
    [complaints]
  );

  // ---------------------- RENDER ----------------------
  return (
    <div className="space-y-6">
      {/* Overview */}
      {section === "overview" && (
        <div>
          <h1 className="text-2xl font-bold text-blue-700">{isSw ? `Habari, ${user.name}` : `Hello, ${user.name}`}</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">{isSw ? "Uwasilishaji wa Mwisho" : "Last Submission"}</h3>
              <p className="text-gray-600">
                {loadingSubmission
                  ? (isSw ? "Inapakia..." : "Loading...")
                  : submission
                    ? new Date(submission.submittedAt).toLocaleDateString()
                    : (isSw ? "Hakuna" : "None")}
              </p>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">{isSw ? "Vitambulisho Vilivyotengenezwa" : "ID Cards Created"}</h3>
              <p className="text-gray-600">{loadingCards ? (isSw ? "Inapakia..." : "Loading...") : idCards.length}</p>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">{isSw ? "Nafasi / Cheo" : "Role / Title"}</h3>
              <p className="text-gray-600">{getCardRole()}</p>
            </div>
          </div>

        </div>
      )}

      {/* Documents */}
      {section === "documents" && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center"><FaFileAlt className="mr-2" /> {isSw ? "Nyaraka Rasmi" : "Official Documents"}</h2>
          {loadingOfficial ? (
            <p className="text-gray-500">{isSw ? "Inapakia nyaraka..." : "Loading documents..."}</p>
          ) : officialDocuments.length === 0 ? (
            <p className="text-gray-500">{isSw ? "Hakuna nyaraka bado." : "No documents available yet."}</p>
          ) : (
            <div className="space-y-3">
              {officialDocuments.map((d) => (
                <div key={d.id} className="border rounded p-3">
                  <p className="font-semibold">{d.title}</p>
                  {d.description && <p className="text-sm text-gray-600 mt-1">{d.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{isSw ? "Imewekwa na" : "Posted by"} {d.createdBy?.name || "Staff"} • {new Date(d.createdAt).toLocaleString()}</p>
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-blue-600 hover:underline">
                    {isSw ? "Fungua / Pakua" : "Open / Download"}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* News & Updates */}
      {section === "updates" && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center"><FaBullhorn className="mr-2" /> {isSw ? "Habari na Taarifa" : "News & Updates"}</h2>
          {loadingOfficial ? (
            <p className="text-gray-500">{isSw ? "Inapakia taarifa..." : "Loading updates..."}</p>
          ) : officialUpdates.length === 0 ? (
            <p className="text-gray-500">{isSw ? "Hakuna taarifa bado." : "No updates posted yet."}</p>
          ) : (
            <div className="space-y-3">
              {officialUpdates.map((u) => (
                <div key={u.id} className="border rounded p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{u.title}</p>
                    {u.category && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{u.category}</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{u.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{isSw ? "Imewekwa na" : "Posted by"} {u.createdBy?.name || "Staff"} • {new Date(u.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF Section */}
      {section === "pdf" && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">{isSw ? "Fomu Yako ya PDF Iliyotengenezwa" : "Your Generated PDF Form"}</h2>
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
              <FaFilePdf className="mr-2" /> {isSw ? "Pakua Fomu" : "Download Form"}
            </button>
          ) : loadingSubmission ? (
            <p className="text-gray-400 animate-pulse">{isSw ? "Inapakia fomu yako..." : "Loading your form..."}</p>
          ) : (
            <p className="text-gray-500">{isSw ? "Bado hujatengeneza PDF ya fomu yako." : "You haven't generated your form PDF yet."}</p>
          )}
        </div>
      )}

      {/* ID Cards — photo upload inline */}
      {(section === "idcards" || section === "generate") && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-4">{isSw ? "Kitambulisho Chako" : "Your ID Card"}</h2>
          {loadingCards ? (
            <p className="text-gray-500">{isSw ? "Inapakia..." : "Loading..."}</p>
          ) : idCards.length === 0 ? (
            <p className="text-gray-500">{isSw ? "Hakuna kitambulisho kilichopatikana." : "No ID card found."}</p>
          ) : (
            <div className="space-y-6">
              {idCards.map((card) => {
                const hasPhoto = !!card.rawPhotoUrl;
                const isClientOnceUsed = user?.role === "CLIENT" && hasPhoto;
                const canUpload = !isClientOnceUsed || ["STAFF", "ADMIN", "SUPERADMIN"].includes(user?.role);
                const photoLabel = hasPhoto
                  ? (isSw ? "Sasisha Picha" : "Update Photo")
                  : (isSw ? "Hakuna Picha — Bonyeza Kupakia" : "No Photo — Tap to Upload");

                return (
                  <div key={card.id} className="space-y-4">
                    <div className="overflow-x-auto">
                      <IDCard card={card} previewOnly={true} />
                    </div>

                    {/* Photo upload area — clickable for staff/admin or first-time client */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <p className="text-sm font-semibold text-slate-700 mb-3">
                        {isSw ? "Picha ya Kitambulisho" : "ID Card Photo"}
                      </p>

                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Clickable photo area */}
                        <label
                          className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 ${
                            canUpload
                              ? "border-blue-400 cursor-pointer hover:opacity-90 transition"
                              : "border-slate-200 cursor-not-allowed opacity-70"
                          } bg-slate-100`}
                        >
                          {(card.cleanPhotoUrl || card.rawPhotoUrl) ? (
                            <img
                              src={card.cleanPhotoUrl || card.rawPhotoUrl}
                              alt="ID photo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
                              <FaCamera size={22} />
                              <span className="text-[10px] text-center leading-tight px-1">
                                {isSw ? "Hakuna Picha" : "No Photo"}
                              </span>
                            </div>
                          )}
                          {canUpload && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                              <FaCamera className="text-white" size={20} />
                            </div>
                          )}
                          {canUpload && (
                            <>
                              {/* Gallery pick */}
                              <input
                                id={`photo-input-${card.id}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                                disabled={uploadingPhoto || isCleaning}
                                className="hidden"
                              />
                            </>
                          )}
                        </label>

                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-slate-600">{photoLabel}</p>

                          {isClientOnceUsed ? (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <FaLock size={10} />
                              {isSw
                                ? "Umeshaseti picha mara moja. Wasiliana na staff kufanya mabadiliko."
                                : "You already uploaded once. Contact staff to update."}
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <label
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-sm font-medium cursor-pointer hover:bg-slate-100 transition ${
                                  uploadingPhoto || isCleaning ? "opacity-50 pointer-events-none" : ""
                                }`}
                              >
                                <FaCamera size={12} />
                                {isSw ? "Chagua Picha" : "Choose Photo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                                  disabled={uploadingPhoto || isCleaning}
                                  className="hidden"
                                />
                              </label>
                              <label
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-400 bg-blue-50 text-sm font-medium cursor-pointer hover:bg-blue-100 transition ${
                                  uploadingPhoto || isCleaning ? "opacity-50 pointer-events-none" : ""
                                }`}
                              >
                                <FaCamera size={12} />
                                {isSw ? "Piga Picha" : "Take Photo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                                  disabled={uploadingPhoto || isCleaning}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}

                          {(uploadingPhoto || isCleaning) && (
                            <div className="mt-2">
                              <p className="text-sm text-blue-600 font-medium">
                                {browserCleaning
                                  ? (isSw ? "Inasafisha kwenye kivinjari..." : "Removing background in browser...")
                                  : (isSw ? `Inapakia... ${cleanProgress}%` : `Uploading... ${cleanProgress}%`)}
                              </p>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${cleanProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Re-clean button for staff/admin in server mode */}
                    {card.rawPhotoUrl && !photoRuntime.preferClientBgRemoval &&
                      ["STAFF", "ADMIN", "SUPERADMIN"].includes(user?.role) && (
                      <button
                        onClick={() => handleReClean(card.id)}
                        disabled={isCleaning}
                        className={`px-3 py-1.5 rounded-lg text-white text-sm ${
                          isCleaning ? "bg-gray-400" : "bg-yellow-600 hover:bg-yellow-700"
                        }`}
                      >
                        <FaRedo className="inline mr-1" />
                        {isSw ? "Safisha Tena Picha" : "Re-clean Photo"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ Support: Complaints */}
      {section === "support-complaints" && (
        <div className="space-y-4">
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-lg font-bold mb-3 flex items-center">
              <FaRegCommentDots className="mr-2" /> {isSw ? "Lalamiko Jipya" : "New Complaint"}
            </h2>
            <div className="space-y-3">
              <input
                value={complaintSubject}
                onChange={(e) => setComplaintSubject(e.target.value)}
                placeholder={isSw ? "Kichwa cha ujumbe" : "Subject / Head"}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
              />
              <textarea
                value={complaintMessage}
                onChange={(e) => setComplaintMessage(e.target.value)}
                placeholder={isSw ? "Andika malalamiko/ujumbe wako..." : "Write your complaint/message..."}
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
              />
              <button
                onClick={submitComplaint}
                disabled={sendingComplaint}
                className={`px-4 py-2 rounded text-white ${sendingComplaint ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isSw ? "Tuma Lalamiko" : "Send Complaint"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded shadow p-6">
            <h3 className="font-semibold mb-2">{isSw ? "Maombi Yangu ya Uhamisho" : "My Transfer Requests"}</h3>
            {!!transferRequests.some((c) => c.unreadForClient) && (
              <button
                onClick={markAllMyComplaintsRead}
                className="mb-3 px-3 py-2 rounded text-sm bg-slate-800 text-white hover:bg-black"
              >
                {isSw ? "Weka Yote Kama Umesoma" : "Mark All as Read"}
              </button>
            )}
            {loadingComplaints ? (
              <p className="text-gray-500">{isSw ? "Inapakia..." : "Loading..."}</p>
            ) : transferRequests.length === 0 ? (
              <p className="text-gray-500">{isSw ? "Bado hakuna maombi ya uhamisho." : "No transfer requests yet."}</p>
            ) : (
              <div className="space-y-2">
                {transferRequests.map((c) => (
                  <div key={c.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{c.subject}</p>
                      <div className="flex items-center gap-2">
                        {complaintHasAttachment(c) && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            <FaPaperclip /> {isSw ? "Ina kiambatisho" : "Has attachment"}
                          </span>
                        )}
                        {complaintHasUnread(c) && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                            {isSw ? "Mpya / Haijasomwa" : "New / Unread"}
                          </span>
                        )}
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
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{c.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(c.createdAt).toLocaleString()}</p>
                    {c.replies?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {c.replies.map((r) => {
                          const parsed = parseReplyContent(r.message);
                          return (
                            <div key={r.id} className="bg-blue-50 border-l-4 border-blue-500 rounded p-3">
                              <p className="text-sm font-semibold text-blue-900">
                                {r.sender?.name} ({r.sender?.role})
                              </p>
                              <p className="text-xs text-gray-500 mb-1">{new Date(r.createdAt).toLocaleString()}</p>
                              {parsed.deleted ? (
                                <p className="text-sm italic text-gray-500">
                                  {isSw ? "Ujumbe umefutwa na mtumaji." : "Message deleted by sender."}
                                </p>
                              ) : (
                                !!parsed.message && <p className="text-sm text-gray-800 whitespace-pre-wrap">{parsed.message}</p>
                              )}

                              {(parsed.editedAt || parsed.deleted) && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                  {parsed.deleted
                                    ? (isSw ? "Imefutwa" : "Deleted")
                                    : (isSw ? "Imehaririwa" : "Edited")}
                                </div>
                              )}

                              {!parsed.deleted && !!parsed.attachmentFileUrl && (
                                <a
                                  href={parsed.attachmentFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 mt-2 text-sm text-blue-700 hover:underline"
                                >
                                  <FaFilePdf /> {isSw ? "Fungua / Pakua PDF" : "Open / Download PDF"}
                                </a>
                              )}

                              {!parsed.deleted && !!parsed.attachmentLinkUrl && (
                                <a
                                  href={parsed.attachmentLinkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 mt-2 ml-3 text-sm text-blue-700 hover:underline"
                                >
                                  <FaFileAlt /> {isSw ? "Fungua Link" : "Open Link"}
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Support: Transfer */}
      {section === "support-transfer" && (
        <div className="space-y-4">
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-lg font-bold mb-3 flex items-center">
              <FaExchangeAlt className="mr-2" /> {isSw ? "Taarifa ya Uhamisho" : "Transfer Notice"}
            </h2>
            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1">{isSw ? "Aina ya Uhamisho" : "Transfer Type"}</label>
              <select
                value={transferMode}
                onChange={(e) => setTransferMode(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
              >
                <option value="EMPLOYER_CHANGE">{isSw ? "Badili kwenda mwajiri mpya" : "Change to new employer"}</option>
                <option value="BRANCH_ONLY">{isSw ? "Hakuna mabadiliko ya mwajiri (tawi tu)" : "No employer change (branch only)"}</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {transferMode === "EMPLOYER_CHANGE" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{isSw ? "Mwajiri / Benki Mpya" : "New Employer / Bank"}</label>
                    <input
                      value={transferEmployer}
                      onChange={(e) => setTransferEmployer(e.target.value)}
                      placeholder={isSw ? "mf. CRDB Bank" : "e.g. CRDB Bank"}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{isSw ? "Namba Mpya ya Mwajiriwa" : "New Employee Number"}</label>
                    <input
                      value={transferNewEmpNo}
                      onChange={(e) => setTransferNewEmpNo(e.target.value)}
                      placeholder={isSw ? "Namba mpya ya mwajiriwa" : "New employee number"}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">{isSw ? "Jina la Tawi Jipya" : "New Branch Name"}</label>
                <input
                  value={transferNewBranch}
                  onChange={(e) => setTransferNewBranch(e.target.value)}
                  placeholder={isSw ? "mf. Tawi la Kariakoo" : "e.g. Kariakoo Branch"}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{isSw ? "Kituo Kipya cha Kazi" : "New Workstation"}</label>
                <input
                  value={transferWorkstation}
                  onChange={(e) => setTransferWorkstation(e.target.value)}
                  placeholder={isSw ? "mf. Teller Desk 4" : "e.g. Teller Desk 4"}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">{isSw ? "Sababu / Maelezo (hiari)" : "Reason / Note (optional)"}</label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  rows={3}
                  placeholder={isSw ? "Eleza kwa nini unabadilisha benki/mwajiri..." : "Explain why you are changing bank/employer..."}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring"
                />
              </div>
            </div>
            <button
              onClick={submitTransferRequest}
              disabled={sendingTransfer}
              className={`mt-3 px-4 py-2 rounded text-white ${sendingTransfer ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"}`}
            >
              {isSw ? "Tuma Ombi la Uhamisho" : "Submit Transfer Request"}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              {isSw ? "Kumbuka: Staff lazima waidhinishe uhamisho kabla namba yako ya mwajiriwa haijabadilika kwenye mfumo." : "Note: Staff must approve the transfer before your employee number changes in the system."}
            </p>
          </div>

          <div className="bg-white rounded shadow p-6">
            <h3 className="font-semibold mb-2">{isSw ? "Maombi / Malalamiko Yangu" : "My Requests / Complaints"}</h3>
            {!!complaints.some((c) => c.unreadForClient) && (
              <button
                onClick={markAllMyComplaintsRead}
                className="mb-3 px-3 py-2 rounded text-sm bg-slate-800 text-white hover:bg-black"
              >
                {isSw ? "Weka Yote Kama Umesoma" : "Mark All as Read"}
              </button>
            )}
            {loadingComplaints ? (
              <p className="text-gray-500">{isSw ? "Inapakia..." : "Loading..."}</p>
            ) : complaints.length === 0 ? (
              <p className="text-gray-500">{isSw ? "Bado hakuna malalamiko." : "No complaints yet."}</p>
            ) : (
              <div className="space-y-2">
                {complaints.map((c) => (
                  <div key={c.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{c.subject}</p>
                      <div className="flex items-center gap-2">
                        {complaintHasAttachment(c) && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            <FaPaperclip /> {isSw ? "Ina kiambatisho" : "Has attachment"}
                          </span>
                        )}
                        {complaintHasUnread(c) && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                            {isSw ? "Mpya / Haijasomwa" : "New / Unread"}
                          </span>
                        )}
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
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{c.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(c.createdAt).toLocaleString()}</p>
                    {c.replies?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {c.replies.map((r) => {
                          const parsed = parseReplyContent(r.message);
                          return (
                            <div key={r.id} className="bg-blue-50 border-l-4 border-blue-500 rounded p-3">
                              <p className="text-sm font-semibold text-blue-900">
                                {r.sender?.name} ({r.sender?.role})
                              </p>
                              <p className="text-xs text-gray-500 mb-1">{new Date(r.createdAt).toLocaleString()}</p>
                              {parsed.deleted ? (
                                <p className="text-sm italic text-gray-500">
                                  {isSw ? "Ujumbe umefutwa na mtumaji." : "Message deleted by sender."}
                                </p>
                              ) : (
                                !!parsed.message && <p className="text-sm text-gray-800 whitespace-pre-wrap">{parsed.message}</p>
                              )}

                              {(parsed.editedAt || parsed.deleted) && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                  {parsed.deleted
                                    ? (isSw ? "Imefutwa" : "Deleted")
                                    : (isSw ? "Imehaririwa" : "Edited")}
                                </div>
                              )}

                              {!parsed.deleted && !!parsed.attachmentFileUrl && (
                                <a
                                  href={parsed.attachmentFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 mt-2 text-sm text-blue-700 hover:underline"
                                >
                                  <FaFilePdf /> {isSw ? "Fungua / Pakua PDF" : "Open / Download PDF"}
                                </a>
                              )}

                              {!parsed.deleted && !!parsed.attachmentLinkUrl && (
                                <a
                                  href={parsed.attachmentLinkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 mt-2 ml-3 text-sm text-blue-700 hover:underline"
                                >
                                  <FaFileAlt /> {isSw ? "Fungua Link" : "Open Link"}
                                </a>
                              )}
                            </div>
                          );
                        })}
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
          {isSw ? "Kama bado hujabadilisha nywila yako," : "If you haven't changed your password,"}{" "}
          <button
            onClick={() => openChangePwModal(true)}
            className="underline font-semibold text-blue-600"
          >
            {isSw ? "bonyeza hapa" : "click here"}
          </button>
          .
        </span>
      </div>
    </div>
  );
}