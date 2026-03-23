// src/pages/StaffDashboard.jsx
import { useEffect, useState, useCallback, useMemo, useContext } from "react";
import { useLocation } from "react-router-dom";
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
  FaPaperclip,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
//import QRCode from "react-qr-code";
import { QRCodeSVG as QRCode } from "qrcode.react";

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

function fileNameFromUrl(url = "") {
  try {
    const value = String(url || "").split("?")[0];
    const parts = value.split("/");
    return parts[parts.length - 1] || "attachment.pdf";
  } catch (_) {
    return "attachment.pdf";
  }
}

const MAX_REPLY_FILE_MB = 10;
const MAX_DOC_FILE_MB = 10;
const MAX_REPLY_FILE_BYTES = MAX_REPLY_FILE_MB * 1024 * 1024;
const MAX_DOC_FILE_BYTES = MAX_DOC_FILE_MB * 1024 * 1024;

function complaintHasAttachment(complaint) {
  return Array.isArray(complaint?.replies) && complaint.replies.some((reply) => {
    const parsed = parseReplyContent(reply?.message || "");
    return !!parsed.attachmentFileUrl || !!parsed.attachmentLinkUrl;
  });
}

function complaintHasUnread(complaint) {
  return !!complaint?.unreadForStaff;
}

function isTransferNoticeComplaint(complaint) {
  return String(complaint?.subject || "").trim().toUpperCase() === "TRANSFER NOTICE";
}

function hasTransferApprovalReply(complaint) {
  return Array.isArray(complaint?.replies) && complaint.replies.some((r) =>
    String(r?.message || "").includes("__TRANSFER_APPROVED__:true")
  );
}

function getUploadErrorMessage(err, fallbackEn, fallbackSw, isSw) {
  const status = err?.response?.status;
  const raw = String(err?.response?.data?.error || err?.message || "");

  if (status === 413 || /file too large|payload too large|request entity too large/i.test(raw)) {
    return isSw
      ? "Faili ni kubwa sana. Tafadhali tumia PDF ndogo (chini ya 10MB)."
      : "File is too large. Please upload a smaller PDF (under 10MB).";
  }

  return isSw ? fallbackSw : fallbackEn;
}

export default function StaffDashboard() {
  const { user, refreshUser } = useAuth();
  const { isSw } = useLanguage();
  const location = useLocation();
  const setSectionMenus = useContext(DashboardSectionMenuContext);

  const activeTab = location.pathname.endsWith("/clients")
    ? "clients"
    : location.pathname.endsWith("/notices")
    ? "notices"
    : location.pathname.endsWith("/complaints")
    ? "complaints"
    : "links";

  const navbarTabs = useMemo(() => ([
    { id: "links", label: isSw ? "Viungo" : "Links", icon: FaLink, href: "/staff/links" },
    { id: "clients", label: isSw ? "Wateja" : "Clients", icon: FaUsers, href: "/staff/clients" },
    { id: "complaints", label: isSw ? "Malalamiko" : "Complaints", icon: FaComments, href: "/staff/complaints" },
    { id: "notices", label: isSw ? "Matangazo" : "Notices", icon: FaBullhorn, href: "/staff/notices" },
  ]), [isSw]);

  useEffect(() => {
    setSectionMenus(navbarTabs);
    return () => setSectionMenus([]);
  }, [setSectionMenus, navbarTabs]);

  const [submissions, setSubmissions] = useState([]);
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyAttachmentFiles, setReplyAttachmentFiles] = useState({});
  const [replyAttachmentLinks, setReplyAttachmentLinks] = useState({});
  const [replyUploadProgress, setReplyUploadProgress] = useState({});
  const [nowMs, setNowMs] = useState(Date.now());

  const [officialDocuments, setOfficialDocuments] = useState([]);
  const [officialUpdates, setOfficialUpdates] = useState([]);
  const [docForm, setDocForm] = useState({ title: "", description: "", fileUrl: "" });
  const [docFile, setDocFile] = useState(null);
  const [docUploadProgress, setDocUploadProgress] = useState(0);
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
        toast.error(isSw ? "Imeshindikana kupakia malalamiko" : "Failed to fetch complaints");
      })
      .finally(() => setLoadingComplaints(false));
  };

  const markAllComplaintsRead = async () => {
    try {
      await api.post("/api/staff/complaints/mark-read");
      setComplaints((prev) => prev.map((c) => ({ ...c, unreadForStaff: false })));
      toast.success(isSw ? "Malalamiko yote yamewekwa kuwa yamesomwa" : "All complaints marked as read");
    } catch (err) {
      console.error(err);
      toast.error(isSw ? "Imeshindikana kuweka kama yamesomwa" : "Failed to mark complaints as read");
    }
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
      toast.error(isSw ? "Imeshindikana kupakia nyaraka/taarifa" : "Failed to fetch official documents/updates");
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
      return Swal.fire(isSw ? "Hakuna Data" : "No Data", isSw ? "Hakuna rekodi zilizopatikana." : "No records found.", "info");
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
      return Swal.fire(isSw ? "Hakuna Data" : "No Data", isSw ? "Hakuna rekodi zilizopatikana." : "No records found.", "info");
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
        title: isSw ? "Tengeneza Kiungo" : "Generate Link",
        html:
          `<input id="swal-hours" class="swal2-input" placeholder="${isSw ? "Masaa ya uhalali" : "Hours valid"}" type="number">` +
          `<input id="swal-max" class="swal2-input" placeholder="${isSw ? "Matumizi ya juu (hiari)" : "Max uses (optional)"}" type="number">`,
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
        title: isSw ? "Kiungo Kimetengenezwa" : "Link Generated",
        html: `<div class="text-left"><div class="font-semibold mb-1">${isSw ? "Msimbo wa Kushiriki:" : "Share Code:"}</div><div class="text-lg tracking-wide">${code}</div><div class="text-xs text-gray-500 mt-2">${isSw ? "Tumia Copy kushiriki kiungo kamili kwa usalama." : "Use Copy to share full link securely."}</div></div>`,
        icon: "success",
      });

      fetchLinks();
    } catch (err) {
      Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Imeshindikana kutengeneza kiungo." : "Failed to generate link.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteLink = async (id, usedCount) => {
    if (usedCount > 0) {
      return Swal.fire(isSw ? "Imefungwa" : "Locked", isSw ? "Huwezi kufuta kiungo kilichotumika." : "Cannot delete used link.", "info");
    }

    const confirm = await Swal.fire({
      title: isSw ? "Futa Kiungo?" : "Delete Link?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/api/staff/link/${id}`);
      Swal.fire(isSw ? "Imefutwa!" : "Deleted!", isSw ? "Kiungo kimefutwa kwa mafanikio" : "Link deleted successfully", "success");
      fetchLinks();
    } catch (err) {
      console.error("Delete link error:", err);
      Swal.fire(isSw ? "Hitilafu" : "Error", err.response?.data?.error || (isSw ? "Imeshindikana kufuta kiungo" : "Failed to delete link"), "error");
    }
  };

  const handleCopyLink = async (token) => {
    const url = `${VITE_FRONTEND_URL}/submission/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(isSw ? "Kiungo kimenakiliwa" : "Link copied");
    } catch {
      toast.error(isSw ? "Imeshindikana kunakili kiungo" : "Failed to copy link");
    }
  };

  const handleShowQr = async (token) => {
    const url = `${VITE_FRONTEND_URL}/submission/${token}`;

    await Swal.fire({
      title: isSw ? "Skani Msimbo wa QR" : "Scan QR Code",
      html: `
        <button id="print-qr-btn" style="margin-bottom:10px;padding:6px 18px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:6px;">&#128438; ${isSw ? "Chapisha QR" : "Print QR"}</button>
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
            win.document.write(`<!DOCTYPE html><html><head><title>FIBUCA QR Code</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff;}p{font-size:11px;word-break:break-all;max-width:280px;text-align:center;margin-top:12px;color:#555;}h2{font-size:16px;margin-bottom:8px;}</style></head><body><h2>${isSw ? "Kiungo cha Uwasilishaji FIBUCA" : "FIBUCA Submission Link"}</h2>${svgHtml}<p>${url}</p></body></html>`);
            win.document.close();
            setTimeout(() => { win.print(); win.close(); }, 400);
          });
        }
      },
      width: 420,
      confirmButtonText: isSw ? "Funga" : "Close",
    });
  };

  const formatTimeLeft = (expiresAt) => {
    if (!expiresAt) return isSw ? "Hakuna mwisho" : "No expiry";
    const diffMs = new Date(expiresAt).getTime() - nowMs;
    if (diffMs <= 0) return isSw ? "Imeisha" : "Expired";
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  const publishDocument = async () => {
    if (!docForm.title.trim() || (!docFile && !docForm.fileUrl.trim())) {
      return toast.error(isSw ? "Weka kichwa na PDF au URL ya nyaraka" : "Provide title and a PDF file or document URL");
    }
    try {
      setPublishingDoc(true);
      setDocUploadProgress(0);

      if (docFile) {
        if (docFile.size > MAX_DOC_FILE_BYTES) {
          return toast.error(isSw ? `PDF imezidi ${MAX_DOC_FILE_MB}MB.` : `PDF exceeds ${MAX_DOC_FILE_MB}MB limit.`);
        }

        const formData = new FormData();
        formData.append("title", docForm.title);
        if (docForm.description) formData.append("description", docForm.description);
        if (docForm.fileUrl) formData.append("fileUrl", docForm.fileUrl);
        formData.append("file", docFile);

        await api.post("/api/staff/documents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (ev) => {
            if (ev.total) {
              const pct = Math.round((ev.loaded / ev.total) * 100);
              setDocUploadProgress(pct);
            }
          },
        });
      } else {
        await api.post("/api/staff/documents", docForm);
      }

      setDocForm({ title: "", description: "", fileUrl: "" });
      setDocFile(null);
      setDocUploadProgress(0);
      toast.success(isSw ? "Nyaraka zimechapishwa" : "Document published");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(getUploadErrorMessage(err, "Failed to publish document", "Imeshindikana kuchapisha nyaraka", isSw));
      setDocUploadProgress(0);
    } finally {
      setPublishingDoc(false);
    }
  };

  const publishUpdate = async () => {
    if (!updateForm.title.trim() || !updateForm.message.trim()) {
      return toast.error(isSw ? "Kichwa na ujumbe vinahitajika" : "Title and message are required");
    }
    try {
      setPublishingUpdate(true);
      await api.post("/api/staff/updates", updateForm);
      setUpdateForm({ title: "", category: "", message: "" });
      toast.success(isSw ? "Taarifa imechapishwa" : "Update published");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kuchapisha taarifa" : "Failed to publish update"));
    } finally {
      setPublishingUpdate(false);
    }
  };

  const canManageItem = (createdById) => {
    if (!user) return false;
    if (["ADMIN", "SUPERADMIN"].includes(user.role)) return true;
    return Number(createdById) === Number(user.id);
  };

  const handleEditReply = async (reply) => {
    const parsed = parseReplyContent(reply.message);
    if (parsed.deleted) {
      return toast.error(isSw ? "Jibu hili limefutwa tayari" : "This reply is already deleted");
    }

    const { value: newMessage } = await Swal.fire({
      title: isSw ? "Hariri Jibu" : "Edit Reply",
      input: "textarea",
      inputValue: parsed.message,
      inputPlaceholder: isSw ? "Andika ujumbe mpya" : "Write updated message",
      showCancelButton: true,
      confirmButtonText: isSw ? "Hifadhi" : "Save",
      cancelButtonText: isSw ? "Ghairi" : "Cancel",
      inputValidator: (v) => (!String(v || "").trim() ? (isSw ? "Ujumbe unahitajika" : "Message is required") : null),
    });

    if (typeof newMessage !== "string") return;

    try {
      await api.put(`/api/staff/complaint-replies/${reply.id}`, { message: newMessage.trim() });
      toast.success(isSw ? "Jibu limehaririwa" : "Reply edited");
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kuhariri jibu" : "Failed to edit reply"));
    }
  };

  const handleDeleteReply = async (reply) => {
    const confirm = await Swal.fire({
      title: isSw ? "Futa Jibu?" : "Delete Reply?",
      text: isSw ? "Litawekwa alama kuwa limefutwa." : "It will be marked as deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: isSw ? "Ndiyo, futa" : "Yes, delete",
      cancelButtonText: isSw ? "Ghairi" : "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/api/staff/complaint-replies/${reply.id}`);
      toast.success(isSw ? "Jibu limefutwa" : "Reply deleted");
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kufuta jibu" : "Failed to delete reply"));
    }
  };

  const handleEditDocument = async (doc) => {
    const { value: values } = await Swal.fire({
      title: isSw ? "Hariri Nyaraka" : "Edit Document",
      html:
        `<input id="swal-doc-title" class="swal2-input" placeholder="${isSw ? "Kichwa" : "Title"}" value="${(doc.title || "").replace(/"/g, "&quot;")}">` +
        `<input id="swal-doc-url" class="swal2-input" placeholder="URL" value="${(doc.fileUrl || "").replace(/"/g, "&quot;")}">` +
        `<textarea id="swal-doc-desc" class="swal2-textarea" placeholder="${isSw ? "Maelezo" : "Description"}">${doc.description || ""}</textarea>`,
      showCancelButton: true,
      confirmButtonText: isSw ? "Hifadhi" : "Save",
      cancelButtonText: isSw ? "Ghairi" : "Cancel",
      preConfirm: () => ({
        title: document.getElementById("swal-doc-title")?.value || "",
        fileUrl: document.getElementById("swal-doc-url")?.value || "",
        description: document.getElementById("swal-doc-desc")?.value || "",
      }),
    });
    if (!values) return;

    try {
      await api.put(`/api/staff/documents/${doc.id}`, values);
      toast.success(isSw ? "Nyaraka zimehaririwa" : "Document updated");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kuhariri nyaraka" : "Failed to edit document"));
    }
  };

  const handleDeleteDocument = async (doc) => {
    const confirm = await Swal.fire({
      title: isSw ? "Futa Nyaraka?" : "Delete Document?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: isSw ? "Ndiyo, futa" : "Yes, delete",
      cancelButtonText: isSw ? "Ghairi" : "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/api/staff/documents/${doc.id}`);
      toast.success(isSw ? "Nyaraka zimefutwa" : "Document deleted");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kufuta nyaraka" : "Failed to delete document"));
    }
  };

  const handleEditUpdate = async (item) => {
    const { value: values } = await Swal.fire({
      title: isSw ? "Hariri Taarifa" : "Edit Update",
      html:
        `<input id="swal-up-title" class="swal2-input" placeholder="${isSw ? "Kichwa" : "Title"}" value="${(item.title || "").replace(/"/g, "&quot;")}">` +
        `<input id="swal-up-cat" class="swal2-input" placeholder="${isSw ? "Kundi" : "Category"}" value="${(item.category || "").replace(/"/g, "&quot;")}">` +
        `<textarea id="swal-up-msg" class="swal2-textarea" placeholder="${isSw ? "Ujumbe" : "Message"}">${item.message || ""}</textarea>`,
      showCancelButton: true,
      confirmButtonText: isSw ? "Hifadhi" : "Save",
      cancelButtonText: isSw ? "Ghairi" : "Cancel",
      preConfirm: () => ({
        title: document.getElementById("swal-up-title")?.value || "",
        category: document.getElementById("swal-up-cat")?.value || "",
        message: document.getElementById("swal-up-msg")?.value || "",
      }),
    });
    if (!values) return;

    try {
      await api.put(`/api/staff/updates/${item.id}`, values);
      toast.success(isSw ? "Taarifa imehaririwa" : "Update edited");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kuhariri taarifa" : "Failed to edit update"));
    }
  };

  const handleDeleteUpdate = async (item) => {
    const confirm = await Swal.fire({
      title: isSw ? "Futa Taarifa?" : "Delete Update?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: isSw ? "Ndiyo, futa" : "Yes, delete",
      cancelButtonText: isSw ? "Ghairi" : "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/api/staff/updates/${item.id}`);
      toast.success(isSw ? "Taarifa imefutwa" : "Update deleted");
      fetchOfficialData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kufuta taarifa" : "Failed to delete update"));
    }
  };

  const updateComplaintStatus = async (id, status) => {
    try {
      await api.put(`/api/staff/complaints/${id}/status`, { status });
      toast.success(isSw ? "Hali imesasishwa" : "Status updated");
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error(isSw ? "Imeshindikana kusasisha hali" : "Failed to update status");
    }
  };

  const approveTransferNotice = async (complaint) => {
    const confirm = await Swal.fire({
      title: isSw ? "Thibitisha Uhamisho?" : "Approve Transfer Notice?",
      text: isSw
        ? "Hatua hii itabadilisha taarifa za mteja kwenye mfumo na kuhifadhi historia ya uhamisho."
        : "This will update client records in the database and save transfer history.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      confirmButtonText: isSw ? "Ndiyo, idhinisha" : "Yes, approve",
      cancelButtonText: isSw ? "Ghairi" : "Cancel",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await api.post(`/api/staff/complaints/${complaint.id}/approve-transfer`);
      toast.success(res?.data?.message || (isSw ? "Uhamisho umeidhinishwa" : "Transfer approved"));
      fetchComplaints();
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || (isSw ? "Imeshindikana kuidhinisha uhamisho" : "Failed to approve transfer"));
    }
  };

  const sendReply = async (complaintId) => {
    const message = (replyDrafts[complaintId] || "").trim();
    const attachmentFile = replyAttachmentFiles[complaintId] || null;
    const attachmentLink = (replyAttachmentLinks[complaintId] || "").trim();

    if (!message && !attachmentFile && !attachmentLink) {
      return toast.error(isSw ? "Andika jibu, ongeza PDF au link" : "Add a reply, PDF file or link");
    }

    try {
      setReplyUploadProgress((prev) => ({ ...prev, [complaintId]: 0 }));

      if (attachmentFile) {
        if (attachmentFile.size > MAX_REPLY_FILE_BYTES) {
          return toast.error(isSw ? `PDF imezidi ${MAX_REPLY_FILE_MB}MB.` : `PDF exceeds ${MAX_REPLY_FILE_MB}MB limit.`);
        }

        const formData = new FormData();
        if (message) formData.append("message", message);
        formData.append("file", attachmentFile);
        if (attachmentLink) formData.append("attachmentLink", attachmentLink);

        await api.post(`/api/staff/complaints/${complaintId}/reply`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (ev) => {
            if (ev.total) {
              const pct = Math.round((ev.loaded / ev.total) * 100);
              setReplyUploadProgress((prev) => ({ ...prev, [complaintId]: pct }));
            }
          },
        });
      } else {
        await api.post(`/api/staff/complaints/${complaintId}/reply`, {
          message,
          ...(attachmentLink ? { attachmentLink } : {}),
        });
        setReplyUploadProgress((prev) => ({ ...prev, [complaintId]: 100 }));
      }

      toast.success(isSw ? "Jibu limetumwa" : "Reply sent");
      setReplyDrafts((prev) => ({ ...prev, [complaintId]: "" }));
      setReplyAttachmentFiles((prev) => ({ ...prev, [complaintId]: null }));
      setReplyAttachmentLinks((prev) => ({ ...prev, [complaintId]: "" }));
      setReplyUploadProgress((prev) => ({ ...prev, [complaintId]: 0 }));
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error(getUploadErrorMessage(err, "Failed to send reply", "Imeshindikana kutuma jibu", isSw));
      setReplyUploadProgress((prev) => ({ ...prev, [complaintId]: 0 }));
    }
  };

  const clientColumns = [
    { name: "#", selector: (_, i) => i + 1, width: "60px" },
    { name: isSw ? "Mwajiriwa" : "Employee", selector: (r) => r.employeeName, sortable: true, wrap: true },
    { name: isSw ? "Namba" : "Number", selector: (r) => r.employeeNumber, wrap: true },
    { name: isSw ? "Mwajiri" : "Employer", selector: (r) => r.employerName, wrap: true },
    { name: isSw ? "Tawi" : "Branch", selector: (r) => r.branchName || "-", wrap: true },
    { name: isSw ? "Simu" : "Phone", selector: (r) => r.phoneNumber || "-", wrap: true },
    { name: isSw ? "Ada" : "Dues", selector: (r) => r.dues },
  ];

  const linkColumns = [
    { name: "#", selector: (_, i) => i + 1, width: "60px" },
    {
      name: isSw ? "Msimbo" : "Code",
      wrap: true,
      cell: (row) => <span className="font-mono text-sm">{String(row.token || "").slice(0, 12)}</span>,
    },
    { name: isSw ? "Matumizi ya Juu" : "Max Uses", selector: (r) => r.maxUses || (isSw ? "Bila kikomo" : "Unlimited") },
    { name: isSw ? "Imetumika" : "Used", selector: (r) => r.usedCount },
    {
      name: "Status",
      cell: (row) => {
        const now = new Date();
        const expired = row.expiresAt && new Date(row.expiresAt) < now;
        const maxed = row.maxUses && row.usedCount >= row.maxUses;

        if (!row.isActive || expired || maxed) {
          return <span className="text-red-600 font-semibold">{isSw ? "Imeisha" : "Expired"}</span>;
        }

        return (
          <div className="text-xs">
            <div className="text-green-600 font-semibold">{isSw ? "Hai" : "Active"}</div>
            <div className="text-slate-500">{formatTimeLeft(row.expiresAt)} {isSw ? "imebaki" : "left"}</div>
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
            <FaCopy /> {isSw ? "Nakili" : "Copy"}
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
              {isSw ? "Futa" : "Delete"}
            </button>
          ) : (
            <span className="text-gray-400 text-xs">{isSw ? "Imefungwa" : "Locked"}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-28 md:pb-0">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <h1 className="text-xl font-bold text-center">{isSw ? "Dashibodi ya Staff" : "Staff Dashboard"}</h1>

        {activeTab === "links" && (
          <div className="grid md:grid-cols-5 gap-4">
            <StatCard icon={<FaUsers />} label={isSw ? "Wateja" : "Clients"} value={stats.totalClients} />
            <StatCard icon={<FaLink />} label={isSw ? "Viungo Vyote" : "Total Links"} value={stats.totalLinks} />
            <StatCard icon={<FaChartLine />} label={isSw ? "Viungo Hai" : "Active Links"} value={stats.activeLinks} />
            <StatCard icon={<FaClock />} label={isSw ? "Viungo Vilivyoisha" : "Expired Links"} value={stats.expiredLinks} />
            <StatCard icon={<FaComments />} label={isSw ? "Malalamiko Wazi" : "Open Complaints"} value={stats.openComplaints} />
          </div>
        )}

        {activeTab === "links" && (
          <>
            <button
              onClick={handleGenerateLink}
              disabled={generating}
              className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
            >
              {generating ? (isSw ? "Inatengeneza..." : "Generating...") : (isSw ? "Tengeneza Kiungo" : "Generate Link")}
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
                placeholder={isSw ? "Tafuta kwa jina, namba, mwajiri, tawi, simu..." : "Search by name, number, employer, branch, phone..."}
                onChange={(e) => handleSearch(e.target.value)}
                className="border rounded px-3 py-2 w-full md:max-w-md"
              />

              <div className="flex gap-3">
                <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded">
                  {isSw ? "Excel" : "Excel"}
                </button>
                <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded">
                  {isSw ? "PDF" : "PDF"}
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
            {!!complaints.some((c) => c.unreadForStaff) && (
              <div>
                <button
                  onClick={markAllComplaintsRead}
                  className="px-3 py-2 rounded text-sm bg-slate-800 text-white hover:bg-black"
                >
                  {isSw ? "Weka Yote Kama Yamesomwa" : "Mark All as Read"}
                </button>
              </div>
            )}
            {loadingComplaints ? (
              <div className="bg-white p-6 rounded shadow text-gray-500">{isSw ? "Inapakia malalamiko..." : "Loading complaints..."}</div>
            ) : complaints.length === 0 ? (
              <div className="bg-white p-6 rounded shadow text-gray-500">{isSw ? "Hakuna malalamiko yaliyopatikana." : "No complaints found."}</div>
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
                      {complaintHasUnread(c) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">
                          {isSw ? "Mpya / Haijasomwa" : "New / Unread"}
                        </span>
                      )}
                      {complaintHasAttachment(c) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          <FaPaperclip /> {isSw ? "Ina kiambatisho" : "Has attachment"}
                        </span>
                      )}
                      {isTransferNoticeComplaint(c) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">
                          {isSw ? "Taarifa ya Uhamisho" : "Transfer Notice"}
                        </span>
                      )}
                      {isTransferNoticeComplaint(c) && !hasTransferApprovalReply(c) && (
                        <button
                          onClick={() => approveTransferNotice(c)}
                          className="px-3 py-1 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          {isSw ? "Idhinisha Uhamisho" : "Approve Transfer"}
                        </button>
                      )}
                      {isTransferNoticeComplaint(c) && hasTransferApprovalReply(c) && (
                        <span className="px-3 py-1 rounded text-sm bg-green-100 text-green-800">
                          {isSw ? "Uhamisho Umeidhinishwa" : "Transfer Approved"}
                        </span>
                      )}
                      <button
                        onClick={() => updateComplaintStatus(c.id, "OPEN")}
                        className={`px-3 py-1 rounded text-sm ${
                          c.status === "OPEN"
                            ? "bg-yellow-500 text-white"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {isSw ? "WAZI" : "OPEN"}
                      </button>
                      <button
                        onClick={() => updateComplaintStatus(c.id, "RESOLVED")}
                        className={`px-3 py-1 rounded text-sm ${
                          c.status === "RESOLVED"
                            ? "bg-green-600 text-white"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {isSw ? "IMETATULIWA" : "RESOLVED"}
                      </button>
                      <button
                        onClick={() => updateComplaintStatus(c.id, "CLOSED")}
                        className={`px-3 py-1 rounded text-sm ${
                          c.status === "CLOSED"
                            ? "bg-gray-700 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isSw ? "IMEFUNGWA" : "CLOSED"}
                      </button>
                    </div>
                  </div>

                  <div className="border rounded p-3 bg-gray-50">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{c.message}</p>
                  </div>

                  {c.replies?.length > 0 && (
                    <div className="space-y-2">
                      {c.replies.map((r) => {
                        const parsed = parseReplyContent(r.message);
                        const canManageReply = canManageItem(r.sender?.id);
                        return (
                          <div key={r.id} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
                            <div className="text-sm font-semibold text-blue-900">
                              {r.sender?.name} ({r.sender?.role})
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                              {new Date(r.createdAt).toLocaleString()}
                            </div>
                            {parsed.deleted ? (
                              <p className="text-sm italic text-gray-500">
                                {isSw ? "Ujumbe umefutwa na mtumaji." : "Message deleted by sender."}
                              </p>
                            ) : (
                              !!parsed.message && <p className="text-sm whitespace-pre-wrap">{parsed.message}</p>
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
                                download={fileNameFromUrl(parsed.attachmentFileUrl)}
                                className="inline-flex items-center gap-2 mt-2 text-sm text-blue-700 hover:underline"
                              >
                                <FaFilePdf /> {isSw ? "Fungua/Pakua PDF" : "Open/Download PDF"}
                              </a>
                            )}

                            {!parsed.deleted && !!parsed.attachmentLinkUrl && (
                              <a
                                href={parsed.attachmentLinkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-2 ml-3 text-sm text-blue-700 hover:underline"
                              >
                                <FaLink /> {isSw ? "Fungua Link" : "Open Link"}
                              </a>
                            )}

                            {canManageReply && !parsed.deleted && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleEditReply(r)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300"
                                >
                                  <FaEdit /> {isSw ? "Hariri" : "Edit"}
                                </button>
                                <button
                                  onClick={() => handleDeleteReply(r)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                                >
                                  <FaTrash /> {isSw ? "Futa" : "Delete"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                      placeholder={isSw ? "Andika jibu..." : "Write reply..."}
                      className="w-full border rounded px-3 py-2"
                    />

                    <div className="grid md:grid-cols-2 gap-2">
                      <label className="border rounded px-3 py-2 bg-white text-sm cursor-pointer hover:bg-gray-50">
                        {isSw ? "Ambatisha PDF" : "Attach PDF"}
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setReplyAttachmentFiles((prev) => ({ ...prev, [c.id]: file }));
                          }}
                        />
                      </label>

                      <input
                        type="url"
                        value={replyAttachmentLinks[c.id] || ""}
                        onChange={(e) =>
                          setReplyAttachmentLinks((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                        placeholder={isSw ? "Au weka link (https://...)" : "Or add link (https://...)"}
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>

                    {replyAttachmentFiles[c.id] && (
                      <p className="text-xs text-gray-600">
                        {isSw ? "PDF iliyochaguliwa:" : "Selected PDF:"} {replyAttachmentFiles[c.id]?.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {isSw ? `Ukubwa wa juu wa PDF: ${MAX_REPLY_FILE_MB}MB` : `Max PDF size: ${MAX_REPLY_FILE_MB}MB`}
                    </p>

                    {replyUploadProgress[c.id] > 0 && replyUploadProgress[c.id] < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                          style={{ width: `${replyUploadProgress[c.id]}%` }}
                        />
                      </div>
                    )}

                    <button
                      onClick={() => sendReply(c.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <FaPaperPlane /> {isSw ? "Tuma Jibu" : "Send Reply"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "notices" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded shadow space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><FaFileAlt /> {isSw ? "Chapisha Nyaraka Rasmi" : "Publish Official Document"}</h3>
              <input
                type="text"
                placeholder={isSw ? "Kichwa cha nyaraka" : "Document title"}
                value={docForm.title}
                onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder={isSw ? "URL ya nyaraka (Cloudinary/Drive/n.k.)" : "Document URL (Cloudinary/Drive/etc)"}
                value={docForm.fileUrl}
                onChange={(e) => setDocForm((p) => ({ ...p, fileUrl: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <label className="block border rounded px-3 py-2 bg-slate-50 hover:bg-slate-100 cursor-pointer text-sm">
                {isSw ? "Au pakia PDF" : "Or upload PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
              </label>
              {docFile && (
                <p className="text-xs text-gray-600">
                  {isSw ? "PDF iliyochaguliwa:" : "Selected PDF:"} {docFile.name}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {isSw ? `Ukubwa wa juu wa PDF: ${MAX_DOC_FILE_MB}MB` : `Max PDF size: ${MAX_DOC_FILE_MB}MB`}
              </p>
              {docUploadProgress > 0 && docUploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${docUploadProgress}%` }}
                  />
                </div>
              )}
              <textarea
                rows={3}
                placeholder={isSw ? "Maelezo (hiari)" : "Description (optional)"}
                value={docForm.description}
                onChange={(e) => setDocForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <button
                onClick={publishDocument}
                disabled={publishingDoc}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {publishingDoc ? (isSw ? "Inachapisha..." : "Publishing...") : (isSw ? "Chapisha Nyaraka" : "Publish Document")}
              </button>
            </div>

            <div className="bg-white p-5 rounded shadow space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><FaBullhorn /> {isSw ? "Chapisha Habari / Taarifa" : "Publish News / Update"}</h3>
              <input
                type="text"
                placeholder={isSw ? "Kichwa cha taarifa" : "Update title"}
                value={updateForm.title}
                onChange={(e) => setUpdateForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder={isSw ? "Kundi (hiari)" : "Category (optional)"}
                value={updateForm.category}
                onChange={(e) => setUpdateForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <textarea
                rows={4}
                placeholder={isSw ? "Ujumbe" : "Message"}
                value={updateForm.message}
                onChange={(e) => setUpdateForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
              <button
                onClick={publishUpdate}
                disabled={publishingUpdate}
                className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-black"
              >
                {publishingUpdate ? (isSw ? "Inachapisha..." : "Publishing...") : (isSw ? "Chapisha Taarifa" : "Publish Update")}
              </button>
            </div>

            <div className="bg-white p-5 rounded shadow">
              <h4 className="font-semibold mb-2">{isSw ? "Nyaraka za Hivi Karibuni" : "Latest Published Documents"}</h4>
              {officialDocuments.length === 0 ? (
                <p className="text-sm text-gray-500">{isSw ? "Bado hakuna nyaraka zilizochapishwa." : "No documents published yet."}</p>
              ) : (
                <div className="space-y-2">
                  {officialDocuments.slice(0, 8).map((d) => (
                    <div key={d.id} className="block border rounded p-3 hover:bg-slate-50">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {isSw ? "Fungua" : "Open"}
                        </a>
                        {canManageItem(d.createdById) && (
                          <>
                            <button
                              onClick={() => handleEditDocument(d)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300"
                            >
                              <FaEdit /> {isSw ? "Hariri" : "Edit"}
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(d)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                            >
                              <FaTrash /> {isSw ? "Futa" : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded shadow">
              <h4 className="font-semibold mb-2">{isSw ? "Taarifa za Hivi Karibuni" : "Latest News / Updates"}</h4>
              {officialUpdates.length === 0 ? (
                <p className="text-sm text-gray-500">{isSw ? "Bado hakuna taarifa zilizochapishwa." : "No updates published yet."}</p>
              ) : (
                <div className="space-y-2">
                  {officialUpdates.slice(0, 8).map((u) => (
                    <div key={u.id} className="block border rounded p-3 hover:bg-slate-50">
                      <div className="font-medium">{u.title}</div>
                      {u.category && <div className="text-xs text-blue-700 mt-1">{u.category}</div>}
                      <div className="text-xs text-gray-500 mt-1">{new Date(u.createdAt).toLocaleString()}</div>
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{u.message}</p>
                      {canManageItem(u.createdById) && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditUpdate(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300"
                          >
                            <FaEdit /> {isSw ? "Hariri" : "Edit"}
                          </button>
                          <button
                            onClick={() => handleDeleteUpdate(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                          >
                            <FaTrash /> {isSw ? "Futa" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
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