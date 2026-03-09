import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { FaSpinner, FaUpload, FaSave, FaFileAlt, FaEdit } from "react-icons/fa";
import { api } from "../lib/api";

const emptyForm = {
  employeeName: "",
  employeeNumber: "",
  employerName: "",
  branchName: "",
  phoneNumber: "",
  dues: "1%",
  witness: "",
};

export default function ScanPaperForm() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [source, setSource] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanUnavailable, setScanUnavailable] = useState(false);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetStateForNewFile = () => {
    setRawText("");
    setConfidence(null);
    setSource("");
    setScanUnavailable(false);
    setForm(emptyForm);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    resetStateForNewFile();

    if (file && file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl("");
    }
  };

  const fillFormFromResponse = (data) => {
    setForm({
      employeeName: data?.extractedData?.employeeName || "",
      employeeNumber: data?.extractedData?.employeeNumber || "",
      employerName: data?.extractedData?.employerName || "",
      branchName: data?.extractedData?.branchName || "",
      phoneNumber: data?.extractedData?.phoneNumber || "",
      dues: data?.extractedData?.dues || "1%",
      witness: data?.extractedData?.witness || "",
    });

    setRawText(data?.rawText || "");
    setConfidence(data?.confidence ?? null);
    setSource(data?.source || "");
  };

  const handleScan = async () => {
    if (!selectedFile) {
      await Swal.fire("No file", "Please choose a PDF or image first.", "warning");
      return;
    }

    setScanning(true);
    setScanUnavailable(false);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);

      const { data } = await api.post("/api/forms/scan", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000,
      });

      fillFormFromResponse(data);

      await Swal.fire(
        "Scan complete",
        "Fields were extracted. Please review and correct them before saving.",
        "success"
      );
    } catch (err) {
      console.error("Scan failed:", err);

      const status = err.response?.status;
      const backendMessage =
        err.response?.data?.details ||
        err.response?.data?.error ||
        "";

      const timeoutLike =
        status === 504 ||
        err.code === "ECONNABORTED" ||
        err.message === "Network Error";

      setScanUnavailable(true);
      setSource("manual-entry");

      await Swal.fire({
        icon: "warning",
        title: "Auto scan unavailable",
        html: `
          <div style="text-align:left">
            <p>Automatic extraction is not available right now.</p>
            <p style="margin-top:8px;">You can still continue by typing the form details manually, then click <strong>Save to DB</strong>.</p>
            ${
              backendMessage
                ? `<p style="margin-top:10px;color:#666;"><strong>Details:</strong> ${backendMessage}</p>`
                : timeoutLike
                ? `<p style="margin-top:10px;color:#666;"><strong>Details:</strong> Server timed out while processing the file.</p>`
                : ""
            }
          </div>
        `,
      });
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (
      !form.employeeName.trim() ||
      !form.employeeNumber.trim() ||
      !form.employerName.trim() ||
      !form.witness.trim()
    ) {
      await Swal.fire(
        "Missing fields",
        "employeeName, employeeNumber, employerName and witness are required.",
        "warning"
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employeeName: form.employeeName.trim(),
        employeeNumber: form.employeeNumber.trim(),
        employerName: form.employerName.trim(),
        branchName: form.branchName.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        dues: form.dues.trim() || "1%",
        witness: form.witness.trim(),
      };

      const { data } = await api.post("/api/forms/scan/save", payload);

      if (data.loginCredentials) {
        await Swal.fire({
          title: "Saved and account created",
          html: `
            <div style="text-align:left">
              <p><strong>Username:</strong> ${data.loginCredentials.username}</p>
              <p><strong>Password:</strong> ${data.loginCredentials.password}</p>
            </div>
          `,
          icon: "success",
        });
      } else {
        await Swal.fire("Saved", "Scanned/manual form saved successfully.", "success");
      }

      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");
      setRawText("");
      setConfidence(null);
      setSource("");
      setScanUnavailable(false);
      setForm(emptyForm);

      const fileInput = document.getElementById("scan-paper-file-input");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Save failed:", err);
      await Swal.fire(
        "Save failed",
        err.response?.data?.details ||
          err.response?.data?.error ||
          "Could not save scanned form.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const fieldList = [
    ["employeeName", "Employee Name"],
    ["employeeNumber", "Employee Number"],
    ["employerName", "Employer Name"],
    ["branchName", "Branch Name"],
    ["phoneNumber", "Phone Number"],
    ["dues", "Union Dues"],
    ["witness", "Witness"],
  ];

  const isPdf = selectedFile?.type?.includes("pdf");
  const isImage = selectedFile?.type?.startsWith("image/");

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Scan Paper Form</h1>
          <p className="text-gray-600 mt-1">
            Upload a scanned PDF or image, review extracted fields, or enter details manually, then save to DB.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold">Upload</h2>

            <input
              id="scan-paper-file-input"
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer"
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleScan}
                disabled={scanning || !selectedFile}
                className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
                  scanning || !selectedFile
                    ? "bg-gray-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {scanning ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                {scanning ? "Scanning..." : "Scan File"}
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
                  saving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {saving ? "Saving..." : "Save to DB"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanUnavailable(true);
                  setSource("manual-entry");
                }}
                className="px-4 py-2 rounded text-white flex items-center gap-2 bg-gray-800 hover:bg-gray-900"
              >
                <FaEdit />
                Manual Entry
              </button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Source:</strong> {source || "—"}</p>
              <p>
                <strong>Confidence:</strong>{" "}
                {confidence != null ? `${Math.round(confidence * 100)}%` : "—"}
              </p>
              <p>
                <strong>File:</strong> {selectedFile?.name || "—"}
              </p>
            </div>

            {scanUnavailable && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                Auto scan is currently unavailable or incomplete. You can still type the fields manually and save.
              </div>
            )}

            {previewUrl && isImage ? (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full object-contain max-h-[500px]"
                />
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-gray-500">
                <FaFileAlt className="mx-auto mb-2" />
                {isPdf
                  ? "PDF selected. Preview is not rendered in this version."
                  : "PDF preview is not rendered in this MVP. Images show here."}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold">Extracted / Manual Fields</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fieldList.map(([name, label]) => (
                <div key={name} className={name === "witness" ? "md:col-span-2" : ""}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Branch and phone are stored in DB for search and communication.
              They should not appear in the generated union PDF.
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Raw Extracted Text</label>
              <textarea
                value={rawText}
                readOnly
                rows={14}
                className="w-full border rounded-lg p-3 bg-gray-50 text-sm"
                placeholder="Extracted OCR/text content will appear here when scan succeeds."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}