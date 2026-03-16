// src/pages/AdminDashboard.jsx
import { useEffect, useState, useCallback, useContext } from "react";
import { api, setAuthToken } from "../lib/api";
import DataTable from "react-data-table-component";
import BottomNavbar from "../components/BottomNavbar";
import { DashboardSectionMenuContext } from "../components/DashboardLayout";
import {
  FaDownload,
  FaFilePdf,
  FaEdit,
  FaTrash,
  FaUpload,
  FaSearch,
  FaPlus,
  FaTrophy,
  FaFileAlt,
  FaUsers,
  FaHistory,
  FaFilter,
  FaChartLine,
  FaKey,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { useLanguage } from "../context/LanguageContext";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSw } = useLanguage();
  const setSectionMenus = useContext(DashboardSectionMenuContext);

  const section = location.pathname.endsWith("/users")
    ? "users"
    : location.pathname.endsWith("/leaderboard")
    ? "leaderboard"
    : location.pathname.endsWith("/reports")
    ? "reports"
    : "submissions";

  const navbarTabs = [
    { id: "submissions", label: isSw ? "Uwasilishaji" : "Submissions", icon: FaFileAlt, href: "/admin/submissions" },
    { id: "users", label: isSw ? "Watumiaji" : "Users", icon: FaUsers, href: "/admin/users" },
    { id: "leaderboard", label: isSw ? "Orodha ya Nafasi" : "Ranking", icon: FaTrophy, href: "/admin/leaderboard" },
    { id: "reports", label: isSw ? "Ripoti" : "Reports", icon: FaChartLine, href: "/admin/reports" },
  ];

  useEffect(() => {
    setSectionMenus(navbarTabs);
    return () => setSectionMenus([]);
  }, [setSectionMenus]);

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [systemUsers, setSystemUsers] = useState([]);
  const [filteredSystemUsers, setFilteredSystemUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingSystemUser, setEditingSystemUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: "",
    username: "",
    email: "",
    employeeNumber: "",
    role: "CLIENT",
    password: "",
  });

  const [submissionFilters, setSubmissionFilters] = useState({
    employerName: "",
    branchName: "",
  });

  const [staffLeaderboard, setStaffLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "https://fibuca-backend.vercel.app";

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    api
      .get("/submissions")
      .then((res) => {
        const rows = res.data || [];
        setUsers(rows);
        setFilteredUsers(rows);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const fetchSystemUsers = useCallback(() => {
    setUserLoading(true);
    api
      .get("/api/admin/users")
      .then((res) => {
        setSystemUsers(res.data || []);
        setFilteredSystemUsers(res.data || []);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch users:", err);
        Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Imeshindikana kupakia watumiaji" : "Failed to fetch users", "error");
      })
      .finally(() => setUserLoading(false));
  }, []);

  const fetchStaffLeaderboard = useCallback(() => {
    setLeaderboardLoading(true);
    api
      .get("/api/staff/leaderboard")
      .then((res) => {
        setStaffLeaderboard(res.data || []);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch leaderboard:", err);
        Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Imeshindikana kupakia orodha ya staff" : "Failed to fetch staff leaderboard", "error");
      })
      .finally(() => setLeaderboardLoading(false));
  }, []);

  useEffect(() => {
    const user =
      JSON.parse(localStorage.getItem("fibuca_user")) ||
      JSON.parse(sessionStorage.getItem("fibuca_user"));

    const token =
      localStorage.getItem("fibuca_token") ||
      sessionStorage.getItem("fibuca_token");

    if (!user || user.role !== "ADMIN") {
      navigate("/login");
      return;
    }

    if (token) setAuthToken(token);

    fetchSubmissions();
    fetchSystemUsers();
    fetchStaffLeaderboard();
  }, [navigate, fetchSubmissions, fetchSystemUsers, fetchStaffLeaderboard]);

  const searchSubmissionsAdvanced = async () => {
    try {
      setLoading(true);
      const params = {};
      if (submissionFilters.employerName) params.employerName = submissionFilters.employerName;
      if (submissionFilters.branchName) params.branchName = submissionFilters.branchName;
      const res = await api.get("/submissions", { params });
      const rows = res.data || [];
      setFilteredUsers(rows);
    } catch (err) {
      console.error("❌ advanced submission search failed:", err);
      Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Imeshindikana kutafuta uwasilishaji" : "Failed to search submissions", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetSubmissionFilters = async () => {
    setSubmissionFilters({
      employerName: "",
      branchName: "",
    });

    try {
      setLoading(true);
      const res = await api.get("/submissions");
      const rows = res.data || [];
      setUsers(rows);
      setFilteredUsers(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserModal = (user = null) => {
    if (user) {
      setEditingSystemUser(user);
      setUserFormData({
        name: user.name,
        username: user.username,
        email: user.email || "",
        employeeNumber: user.employeeNumber || "",
        role: user.role,
        password: "",
      });
    } else {
      setEditingSystemUser(null);
      setUserFormData({
        name: "",
        username: "",
        email: "",
        employeeNumber: "",
        role: "CLIENT",
        password: "",
      });
    }
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setEditingSystemUser(null);
  };

  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async () => {
    try {
      if (!userFormData.name || !userFormData.username) {
        return Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Jina na Username vinahitajika" : "Name and Username are required", "error");
      }

      if (editingSystemUser) {
        await api.put(`/api/admin/users/${editingSystemUser.id}`, {
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role,
          employeeNumber: userFormData.employeeNumber,
        });
        Swal.fire(isSw ? "Imefanikiwa!" : "Success!", isSw ? "Mtumiaji amesasishwa kwa mafanikio" : "User updated successfully", "success");
      } else {
        if (!userFormData.password || userFormData.password.length < 6) {
          return Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Nywila lazima iwe na angalau herufi 6" : "Password must be at least 6 characters", "error");
        }
        await api.post("/api/admin/users", userFormData);
        Swal.fire(isSw ? "Imefanikiwa!" : "Success!", isSw ? "Mtumiaji ameundwa kwa mafanikio" : "User created successfully", "success");
      }

      handleCloseUserModal();
      fetchSystemUsers();
    } catch (err) {
      Swal.fire(isSw ? "Hitilafu" : "Error", err.response?.data?.error || (isSw ? "Imeshindikana kuhifadhi mtumiaji" : "Failed to save user"), "error");
    }
  };

  const handleDeleteUser = (userId) => {
    Swal.fire({
      title: isSw ? "Futa Mtumiaji?" : "Delete User?",
      text: isSw ? "Kitendo hiki hakiwezi kurejeshwa." : "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
    }).then((result) => {
      if (result.isConfirmed) {
        api
          .delete(`/api/admin/users/${userId}`)
          .then(() => {
            Swal.fire(isSw ? "Imefutwa!" : "Deleted!", isSw ? "Mtumiaji amefutwa kwa mafanikio" : "User deleted successfully", "success");
            fetchSystemUsers();
          })
          .catch((err) =>
            Swal.fire(isSw ? "Hitilafu" : "Error", err.response?.data?.error || (isSw ? "Imeshindikana kufuta mtumiaji" : "Failed to delete user"), "error")
          );
      }
    });
  };

  const handleResetPassword = async (user) => {
    const { value: newPassword } = await Swal.fire({
      title: isSw ? "Weka Upya Nywila" : "Reset Password",
      html: `<p style="margin-bottom:8px">${isSw ? "Weka nywila ya muda kwa" : "Set a temporary password for"} <b>${user.name || user.username}</b>.<br/>${isSw ? "Ataombwa kuibadilisha wakati wa kuingia tena." : "They will be prompted to change it on next login."}</p>`,
      input: "password",
      inputLabel: isSw ? "Nywila mpya ya muda" : "New temporary password",
      inputPlaceholder: isSw ? "Angalau herufi 6" : "Min. 6 characters",
      inputAttributes: { autocomplete: "new-password" },
      showCancelButton: true,
      confirmButtonColor: "#1e3a5f",
      confirmButtonText: isSw ? "Weka upya" : "Reset",
      inputValidator: (v) => (!v || v.length < 6 ? (isSw ? "Nywila lazima iwe na angalau herufi 6" : "Password must be at least 6 characters") : null),
    });
    if (!newPassword) return;

    try {
      await api.post(`/api/admin/users/${user.id}/reset-password`, { newPassword });
      Swal.fire(isSw ? "Imekamilika!" : "Done!", isSw ? "Nywila imewekwa upya. Mtumiaji ataombwa kuibadilisha wakati wa kuingia tena." : "Password has been reset. User will be prompted to change it on next login.", "success");
    } catch (err) {
      Swal.fire(isSw ? "Hitilafu" : "Error", err.response?.data?.error || (isSw ? "Imeshindikana kuweka upya nywila" : "Failed to reset password"), "error");
    }
  };

  const handleSearchUsers = (value) => {
    if (!value) return setFilteredSystemUsers(systemUsers);
    if (!value) return setFilteredSystemUsers(systemUsers);

    const results = systemUsers.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(value.toLowerCase()) ||
        (u.username || "").toLowerCase().includes(value.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(value.toLowerCase())
    );

    setFilteredSystemUsers(results);
  };

  const handleSearch = (value) => {
    if (!value) return setFilteredUsers(users);

    const results = users.filter(
      (u) =>
        (u.employeeName || "").toLowerCase().includes(value.toLowerCase()) ||
        (u.employeeNumber || "").toLowerCase().includes(value.toLowerCase()) ||
        (u.employerName || "").toLowerCase().includes(value.toLowerCase()) ||
        (u.branchName || "").toLowerCase().includes(value.toLowerCase()) ||
        (u.phoneNumber || "").toLowerCase().includes(value.toLowerCase())
    );

    setFilteredUsers(results);
  };

  const exportToExcel = () => {
    if (!filteredUsers.length) {
      return Swal.fire(isSw ? "Hakuna Data" : "No Data", isSw ? "Hakuna rekodi zilizopatikana." : "No records found.", "info");
    }

    const data = filteredUsers.map((user, index) => ({
      SN: index + 1,
      Name: user.employeeName,
      Number: user.employeeNumber,
      Phone: user.phoneNumber || "",
      Employer: user.employerName || "",
      Branch: user.branchName || "",
      Dues: user.dues,
      Submitted: user.submittedAt ? new Date(user.submittedAt).toLocaleString() : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    XLSX.writeFile(workbook, "fibuca_clients.xlsx");
  };

  const exportToPDF = () => {
    if (!filteredUsers.length) {
      return Swal.fire(isSw ? "Hakuna Data" : "No Data", isSw ? "Hakuna rekodi zilizopatikana." : "No records found.", "info");
    }

    const doc = new jsPDF();
    autoTable(doc, {
      head: [["SN", "Name", "Number", "Phone", "Employer", "Branch", "Dues", "Submitted"]],
      body: filteredUsers.map((user, index) => [
        index + 1,
        user.employeeName,
        user.employeeNumber,
        user.phoneNumber || "",
        user.employerName || "",
        user.branchName || "",
        user.dues,
        user.submittedAt ? new Date(user.submittedAt).toLocaleString() : "",
      ]),
    });
    doc.save("fibuca_clients.pdf");
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      employeeName: user.employeeName || "",
      employeeNumber: user.employeeNumber || "",
      employerName: user.employerName || "",
      branchName: user.branchName || "",
      phoneNumber: user.phoneNumber || "",
      dues: user.dues || "",
      witness: user.witness || "",
    });
  };

  const handleUpdate = () => {
    api
      .put(`/submissions/${editingUser.id}`, editForm)
      .then(() => {
        setEditingUser(null);
        fetchSubmissions();
        Swal.fire("Updated!", "Record updated successfully.", "success");
      })
      .catch((err) => {
        console.error(err);
        Swal.fire("Error", err.response?.data?.error || "Failed to update record", "error");
      });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Delete this record?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
    }).then((result) => {
      if (result.isConfirmed) {
        api
          .delete(`/submissions/${id}`)
          .then(() => {
            fetchSubmissions();
            Swal.fire("Deleted!", "", "success");
          })
          .catch((err) => {
            console.error(err);
            Swal.fire("Error", err.response?.data?.error || "Failed to delete submission", "error");
          });
      }
    });
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json(worksheet);

      await api.post("/bulk-upload", { records });
      fetchSubmissions();
      Swal.fire(isSw ? "Imefanikiwa" : "Success", isSw ? "Rekodi zimepakiwa!" : "Users uploaded!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Upakiaji umeshindikana." : "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleViewTransfers = async (row) => {
    try {
      const matchedUser = systemUsers.find(
        (u) => u.employeeNumber === row.employeeNumber
      );

      if (!matchedUser) {
        return Swal.fire(isSw ? "Haijapatikana" : "Not Found", isSw ? "Hakuna mtumiaji wa mfumo aliyeunganishwa na uwasilishaji huu." : "No linked system user found for this submission.", "info");
      }

      const { data } = await api.get(`/api/users/${matchedUser.id}/transfers`);

      if (!data || data.length === 0) {
        return Swal.fire(isSw ? "Hakuna Historia ya Uhamisho" : "No Transfer History", isSw ? "Mteja huyu bado hana historia ya uhamisho." : "This client has no transfer history yet.", "info");
      }

      const html = data
        .map(
          (t) => `
            <div style="text-align:left; border:1px solid #ddd; border-radius:8px; padding:10px; margin-bottom:10px;">
              <div><b>${isSw ? "Mwajiri wa Zamani" : "Old Employer"}:</b> ${t.oldEmployerName || (isSw ? "Haipo" : "N/A")}</div>
              <div><b>${isSw ? "Mwajiri Mpya" : "New Employer"}:</b> ${t.newEmployerName || (isSw ? "Haipo" : "N/A")}</div>
              <div><b>${isSw ? "Tawi la Zamani" : "Old Branch"}:</b> ${t.oldBranchName || (isSw ? "Haipo" : "N/A")}</div>
              <div><b>${isSw ? "Tawi Jipya" : "New Branch"}:</b> ${t.newBranchName || (isSw ? "Haipo" : "N/A")}</div>
              <div><b>${isSw ? "Simu ya Zamani" : "Old Phone"}:</b> ${t.oldPhoneNumber || (isSw ? "Haipo" : "N/A")}</div>
              <div><b>${isSw ? "Simu Mpya" : "New Phone"}:</b> ${t.newPhoneNumber || (isSw ? "Haipo" : "N/A")}</div>
              <div><b>${isSw ? "Namba ya Zamani ya Mwajiriwa" : "Old Employee #"}:</b> ${t.oldEmployeeNumber}</div>
              <div><b>${isSw ? "Namba Mpya ya Mwajiriwa" : "New Employee #"}:</b> ${t.newEmployeeNumber}</div>
              <div><b>${isSw ? "Maelezo" : "Note"}:</b> ${t.note || (isSw ? "Haipo" : "N/A")}</div>
              <div><b>${isSw ? "Tarehe" : "Date"}:</b> ${new Date(t.createdAt).toLocaleString()}</div>
              <div><b>${isSw ? "Amefanya" : "Performed By"}:</b> ${t.performedBy?.name || (isSw ? "Haijulikani" : "Unknown")}</div>
            </div>
          `
        )
        .join("");

      Swal.fire({
        title: isSw ? "Historia ya Uhamisho" : "Transfer History",
        html: `<div style="max-height:420px;overflow:auto;">${html}</div>`,
        width: 700,
        confirmButtonText: isSw ? "Funga" : "Close",
      });
    } catch (err) {
      console.error("❌ transfer history fetch failed:", err);
      Swal.fire(isSw ? "Hitilafu" : "Error", isSw ? "Imeshindikana kupakia historia ya uhamisho" : "Failed to fetch transfer history", "error");
    }
  };

  const submissionColumns = [
    { name: "#", selector: (row, index) => index + 1, width: "60px" },
    { name: isSw ? "Mwajiriwa" : "Employee", selector: (row) => row.employeeName, sortable: true, wrap: true },
    { name: isSw ? "Namba" : "Number", selector: (row) => row.employeeNumber, wrap: true },
    { name: isSw ? "Simu" : "Phone", selector: (row) => row.phoneNumber || "-", wrap: true },
    { name: isSw ? "Mwajiri" : "Employer", selector: (row) => row.employerName || "-", wrap: true },
    { name: isSw ? "Tawi" : "Branch", selector: (row) => row.branchName || "-", wrap: true },
    { name: isSw ? "Ada" : "Dues", selector: (row) => row.dues || "-" },
    {
      name: "PDF",
      cell: (row) => {
        if (!row.pdfPath) return <span className="text-gray-400">{isSw ? "Hakuna" : "None"}</span>;
        const pdfUrl = row.pdfPath.startsWith("http") ? row.pdfPath : `${BACKEND_URL}/${row.pdfPath}`;
        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:underline flex items-center gap-1"
            title={isSw ? "Fungua PDF" : "Open PDF"}
          >
            <FaFilePdf />
          </a>
        );
      },
    },
    {
      name: isSw ? "Pakua" : "Download",
      cell: (row) => {
        if (!row.pdfPath) return <span className="text-gray-400">—</span>;
        const pdfUrl = row.pdfPath.startsWith("http") ? row.pdfPath : `${BACKEND_URL}/${row.pdfPath}`;
        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
            title={isSw ? "Pakua PDF" : "Download PDF"}
          >
            <FaDownload />
          </a>
        );
      },
    },
    {
      name: isSw ? "Uhamisho" : "Transfers",
      cell: (row) => (
        <button
          onClick={() => handleViewTransfers(row)}
          className="text-purple-600 hover:underline flex items-center gap-1"
          title={isSw ? "Tazama historia ya uhamisho" : "View transfer history"}
        >
          <FaHistory />
        </button>
      ),
    },
    {
      name: isSw ? "Vitendo" : "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  const userColumns = [
    { name: "#", selector: (row, index) => index + 1, width: "60px" },
    { name: isSw ? "Jina" : "Name", selector: (row) => row.name, sortable: true, wrap: true },
    { name: "Username", selector: (row) => row.username, wrap: true },
    { name: "Email", selector: (row) => row.email || "-", wrap: true },
    { name: isSw ? "Nafasi" : "Role", selector: (row) => row.role, sortable: true },
    { name: isSw ? "Namba ya Mwajiriwa" : "Employee #", selector: (row) => row.employeeNumber || "-" },
    {
      name: isSw ? "Vitendo" : "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenUserModal(row)}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            title={isSw ? "Hariri mtumiaji" : "Edit user"}
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleResetPassword(row)}
            className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
            title={isSw ? "Weka upya nywila" : "Reset password"}
          >
            <FaKey />
          </button>
          <button
            onClick={() => handleDeleteUser(row.id)}
            className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
            title={isSw ? "Futa mtumiaji" : "Delete user"}
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-28 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{isSw ? "Dashibodi ya Admin" : "Admin Dashboard"}</h1>
          <p className="text-gray-600">{isSw ? "Simamia uwasilishaji, watumiaji, nafasi na ripoti" : "Manage submissions, users, leaderboard and reports"}</p>
        </div>

        {section === "submissions" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-5 space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <h2 className="text-2xl font-bold">{isSw ? "Uwasilishaji wa Wateja" : "Client Submissions"}</h2>

                <div className="relative w-full md:w-80">
                  <FaSearch className="absolute top-3 left-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder={isSw ? "Tafuta haraka jina / namba / mwajiri..." : "Quick search name / no / employer..."}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  placeholder={isSw ? "Mwajiri mf. CRDB" : "Employer e.g. CRDB"}
                  value={submissionFilters.employerName}
                  onChange={(e) =>
                    setSubmissionFilters((prev) => ({ ...prev, employerName: e.target.value }))
                  }
                  className="border rounded-lg px-3 py-2"
                />

                <input
                  placeholder={isSw ? "Tawi mf. Kariakoo" : "Branch e.g. Kariakoo"}
                  value={submissionFilters.branchName}
                  onChange={(e) =>
                    setSubmissionFilters((prev) => ({ ...prev, branchName: e.target.value }))
                  }
                  className="border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={searchSubmissionsAdvanced}
                  className="bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-indigo-700 transition flex items-center gap-1.5"
                >
                  <FaFilter /> {isSw ? "Chuja" : "Filter"}
                </button>

                <button
                  onClick={resetSubmissionFilters}
                  className="bg-gray-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-gray-700 transition"
                >
                  {isSw ? "Weka upya" : "Reset"}
                </button>

                <label className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-blue-700 transition">
                  <FaUpload className="inline mr-2" />
                  {uploading ? (isSw ? "Inapakia..." : "Uploading...") : (isSw ? "Pakia Excel" : "Upload Excel")}
                  <input type="file" accept=".xlsx,.xls" hidden onChange={handleUploadExcel} />
                </label>

                <button
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-green-700 transition"
                >
                  <FaDownload className="inline mr-2" /> Excel
                </button>

                <button
                  onClick={exportToPDF}
                  className="bg-red-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-red-700 transition"
                >
                  <FaFilePdf className="inline mr-2" /> PDF
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <DataTable
                columns={submissionColumns}
                data={filteredUsers}
                pagination
                progressPending={loading}
                highlightOnHover
                responsive
                striped
              />
            </div>
          </div>
        )}

        {section === "users" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <h2 className="text-2xl font-bold">{isSw ? "Watumiaji wa Mfumo" : "System Users"}</h2>
                <div className="flex gap-3 flex-wrap">
                  <div className="relative w-full md:w-80">
                    <FaSearch className="absolute top-3 left-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder={isSw ? "Tafuta watumiaji..." : "Search users..."}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleOpenUserModal()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <FaPlus /> {isSw ? "Ongeza Mtumiaji" : "Add User"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <DataTable
                columns={userColumns}
                data={filteredSystemUsers}
                pagination
                progressPending={userLoading}
                highlightOnHover
                responsive
                striped
              />
            </div>
          </div>
        )}

        {section === "leaderboard" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">{isSw ? "Orodha ya Utendaji wa Staff" : "Staff Performance Leaderboard"}</h2>
              <p className="text-gray-600 mb-4">{isSw ? "Imepangwa kwa idadi ya viungo hai vya usambazaji" : "Ranked by number of active distribution links"}</p>

              {leaderboardLoading ? (
                <div className="text-center py-8 text-gray-500">{isSw ? "Inapakia orodha ya nafasi..." : "Loading leaderboard..."}</div>
              ) : staffLeaderboard.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {staffLeaderboard.map((staff, idx) => (
                    <div
                      key={staff.id}
                      className={`p-6 rounded-lg border-2 ${
                        idx === 0
                          ? "border-yellow-400 bg-yellow-50"
                          : idx === 1
                          ? "border-gray-400 bg-gray-50"
                          : idx === 2
                          ? "border-orange-400 bg-orange-50"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-600 mb-1">
                            {idx === 0 && "🥇 "}
                            {idx === 1 && "🥈 "}
                            {idx === 2 && "🥉 "}
                            {isSw ? `Nafasi #${idx + 1}` : `Rank #${idx + 1}`}
                          </div>
                          <h3 className="text-lg font-bold text-gray-800">{staff.name}</h3>
                          <p className="text-sm text-gray-600">{staff.username}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{staff.activeLinks}</div>
                          <div className="text-xs text-gray-600">{isSw ? "Viungo Hai" : "Active Links"}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{staff.totalLinks}</div>
                          <div className="text-xs text-gray-600">{isSw ? "Viungo Vyote" : "Total Links"}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{staff.totalClients}</div>
                          <div className="text-xs text-gray-600">{isSw ? "Wateja" : "Clients"}</div>
                        </div>
                      </div>

                      {staff.email && (
                        <p className="text-xs text-gray-600 mt-3 truncate">📧 {staff.email}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">{isSw ? "Hakuna staff waliopatikana" : "No staff members found"}</div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{isSw ? "Unahitaji uchambuzi wa kina?" : "Need deeper insight?"}</h3>
                  <p className="text-gray-600 text-sm">
                    {isSw ? "Fungua ukurasa wa ripoti kwa mwenendo, muhtasari na uchambuzi wa kuona." : "Open the reports page for trends, summaries and visual analytics."}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/admin/reports")}
                  className="bg-blue-700 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 transition flex items-center gap-2"
                >
                  <FaChartLine /> {isSw ? "Fungua Ripoti" : "Open Reports"}
                </button>
              </div>
            </div>
          </div>
        )}

        {section === "reports" && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl">
                <FaChartLine />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{isSw ? "Ripoti za Kina" : "Advanced Reports"}</h2>
              <p className="text-gray-600 mb-6">
                {isSw ? "Ukurasa wa uchambuzi umetenganishwa na dashibodi kuu kwa mtiririko bora wa kazi za admin." : "Your analytics page is now separated from the main dashboard for cleaner admin workflow."}
              </p>
              <button
                onClick={() => navigate("/admin/reports")}
                className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition"
              >
                {isSw ? "Nenda Kwenye Ukurasa wa Ripoti" : "Go to Reports Page"}
              </button>
            </div>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{isSw ? "Hariri Uwasilishaji" : "Edit Submission"}</h2>

            {Object.keys(editForm).map((field) => (
              <div key={field} className="mb-3">
                <label className="block text-sm font-medium mb-1 capitalize">
                  {field.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  value={editForm[field]}
                  onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                {isSw ? "Ghairi" : "Cancel"}
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                {isSw ? "Hifadhi" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSystemUser ? (isSw ? "Hariri Mtumiaji" : "Edit User") : (isSw ? "Unda Mtumiaji Mpya" : "Create New User")}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{isSw ? "Jina *" : "Name *"}</label>
                <input
                  type="text"
                  name="name"
                  value={userFormData.name}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={isSw ? "Jina kamili" : "Full name"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{isSw ? "Jina la Mtumiaji *" : "Username *"}</label>
                <input
                  type="text"
                  name="username"
                  value={userFormData.username}
                  onChange={handleUserFormChange}
                  disabled={!!editingSystemUser}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  placeholder={isSw ? "Username ya kipekee" : "Unique username"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{isSw ? "Barua Pepe" : "Email"}</label>
                <input
                  type="email"
                  name="email"
                  value={userFormData.email}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{isSw ? "Namba ya Mwajiriwa" : "Employee Number"}</label>
                <input
                  type="text"
                  name="employeeNumber"
                  value={userFormData.employeeNumber}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={isSw ? "Hiari" : "Optional"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{isSw ? "Nafasi" : "Role"}</label>
                <select
                  name="role"
                  value={userFormData.role}
                  onChange={handleUserFormChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="CLIENT">{isSw ? "Mteja" : "Client"}</option>
                  <option value="STAFF">{isSw ? "Staff" : "Staff"}</option>
                  <option value="ADMIN">{isSw ? "Admin" : "Admin"}</option>
                </select>
              </div>

              {!editingSystemUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">{isSw ? "Nywila *" : "Password *"}</label>
                  <input
                    type="password"
                    name="password"
                    value={userFormData.password}
                    onChange={handleUserFormChange}
                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={isSw ? "Angalau herufi 6" : "Min. 6 characters"}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseUserModal}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
              >
                {isSw ? "Ghairi" : "Cancel"}
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingSystemUser ? (isSw ? "Sasisha" : "Update") : (isSw ? "Unda" : "Create")}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavbar tabs={navbarTabs} />
    </div>
  );
}