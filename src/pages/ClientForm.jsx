import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import { api } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { FaSpinner } from "react-icons/fa";

export default function ClientForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    employeeName: "",
    employeeNumber: "",
    employerName: "",
    dues: "1%",
    witness: "",
    employeeDate: "",
    witnessDate: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [employeeSigOpen, setEmployeeSigOpen] = useState(false);
  const [witnessSigOpen, setWitnessSigOpen] = useState(false);

  const [employeeSignature, setEmployeeSignature] = useState(null);
  const [witnessSignature, setWitnessSignature] = useState(null);

  const sigPadRef = useRef(null);
  const witnessSigPadRef = useRef(null);

  // Default dates
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setForm(f => ({ ...f, employeeDate: today, witnessDate: today }));
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.employeeName.trim()) newErrors.employeeName = "Required";
    if (!form.employeeNumber.trim()) newErrors.employeeNumber = "Required";
    if (!form.employerName.trim()) newErrors.employerName = "Required";
    if (!form.witness.trim()) newErrors.witness = "Required";
    if (!employeeSignature) newErrors.employeeSignature = "Required";
    if (!witnessSignature) newErrors.witnessSignature = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ================= PDF =================
const generatePDF = async () => {
  if (!validate()) {
    Swal.fire("Missing Information", "Please complete all fields.", "warning");
    return;
  }

  const confirmAgreement = await Swal.fire({
    title: "Confirm Agreement",
    html: `
      <div style="text-align:left">
        <p><strong>By submitting this form, you agree to:</strong></p>
        <p>1. Employer will deduct union dues monthly.</p>
        <p>2. Deductions may be adjusted with written notice.</p>
        <p>3. You may cancel by one month written notice.</p>
      </div>
    `,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "I Agree & Submit"
  });

  if (!confirmAgreement.isConfirmed) return;

  setLoading(true);

  try {
   const doc = new jsPDF({
  orientation: "p",
  unit: "mm",
  format: "a4",
  compress: true
});
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // ================= HEADER =================
    doc.setFont("Times", "italic");
    doc.setFontSize(12);
    doc.text("Employment and Labour Relations (General)", pageWidth / 2, y, { align: "center" });

    y += 3;
    doc.line(margin, y, pageWidth - margin, y);

    y += 6;
    doc.setFontSize(11);
    doc.text("G.N No. 47 (contd.)", margin, y);
    doc.setFont("Times", "bold");
    doc.text("TUF. 15", pageWidth - margin, y, { align: "right" });

    y += 12;

    // ================= TITLE =================
    doc.setFont("Times", "normal");
    doc.setFontSize(11);
    doc.text(
      "EMPLOYEE INSTRUCTION TO EMPLOYER TO DEDUCT DUES OF A REGISTERED TRADE UNION FROM EMPLOYEE’S WAGES",
      pageWidth / 2,
      y,
      { align: "center", maxWidth: 170 }
    );

    y += 10;
    doc.setFont("Times", "italic");
    doc.setFontSize(11);
    doc.text("(Made under Regulation 34(1))", pageWidth / 2, y, { align: "center" });

    y += 15;

    // ================= FORM FIELDS =================
    doc.setFont("Times", "normal");
    doc.setFontSize(12);

    const drawField = (label, value) => {
      doc.text(`${label}:`, margin, y);
      const lineStart = margin + 55;
      doc.line(lineStart, y + 1, pageWidth - margin, y + 1);
      doc.text(value, lineStart + 5, y);
      y += 10;
    };

    drawField("EMPLOYEE'S NAME", form.employeeName);
    drawField("EMPLOYEE NUMBER", form.employeeNumber);
    drawField("EMPLOYER NAME", form.employerName);
    drawField("TRADE UNION NAME", "FIBUCA");

    // DUES CENTERED
    const duesLabel = "INITIAL MONTHLY UNION DUES:";
    const labelWidth =
      (doc.getStringUnitWidth(duesLabel) *
        doc.internal.getFontSize()) /
      doc.internal.scaleFactor;

    const duesStart = margin + labelWidth + 5;
    doc.text(duesLabel, margin, y);
    doc.line(duesStart, y + 1, pageWidth - margin, y + 1);
    doc.text(form.dues, (duesStart + pageWidth - margin) / 2, y, { align: "center" });

    y += 15;

    // ================= CLAUSES =================
    const clauses = [
      "1. I the above mentioned employee hereby instruct my employer to deduct monthly from my wages, trade union dues owing to my union.",
      "2. I agree that the amount deducted may from time to time be increased, provided that I am given written notification of this in advance.",
      "3. I confirm my understanding that I am entitled at any stage to cancel this instruction by giving one month’s written notice to my trade union and my employer."
    ];

    clauses.forEach(text => {
      const split = doc.splitTextToSize(text, pageWidth - margin * 2);
      doc.text(split, margin, y);
      y += split.length * 6 + 4;
    });

    y += 15;

    // ================= SIGNATURE SECTION =================
    const lineWidth = 65;
    const dateWidth = 40;
    const signHeight = 15;
    const signWidth = 50;

    // ---- EMPLOYEE ROW ----
    const empSignStart = margin;
    const empSignEnd = empSignStart + lineWidth;

    const empDateEnd = pageWidth - margin;
    const empDateStart = empDateEnd - dateWidth;

    doc.line(empSignStart, y, empSignEnd, y);
    doc.line(empDateStart, y, empDateEnd, y);

    const empImgX = empSignStart + (lineWidth - signWidth) / 2;
doc.addImage(employeeSignature, "JPEG", empImgX, y - signHeight, signWidth, signHeight);
    doc.setFontSize(11);
    doc.text(form.employeeDate, empDateStart + dateWidth / 2, y - 1, { align: "center" });

    y += 6;

    doc.setFontSize(10);
    doc.text("Employee Signature", empSignStart + lineWidth / 2, y, { align: "center" });
    doc.text("Date", empDateStart + dateWidth / 2, y, { align: "center" });

    // ---- WITNESS ROW ----
    y += 14;

    const witSignStart = margin;
    const witSignEnd = witSignStart + lineWidth;

    const witDateEnd = pageWidth - margin;
    const witDateStart = witDateEnd - dateWidth;

    doc.line(witSignStart, y, witSignEnd, y);
    doc.line(witDateStart, y, witDateEnd, y);

    // Add witness name text
    doc.setFontSize(11);
    doc.text(form.witness, witSignStart + 5, y);

    const witImgX = witSignStart + (lineWidth - signWidth) / 2;
doc.addImage(witnessSignature, "JPEG", witImgX, y - signHeight, signWidth, signHeight);
    doc.setFontSize(11);
    doc.text(form.witnessDate, witDateStart + dateWidth / 2, y - 1, { align: "center" });

    y += 6;

    doc.setFontSize(10);
    doc.text("Witness Name and Signature", witSignStart + lineWidth / 2, y, { align: "center" });
    doc.text("Date", witDateStart + dateWidth / 2, y, { align: "center" });

    // ================= SAVE & UPLOAD =================
    const pdfBlob = doc.output("blob", { compress: true });
    const formData = new FormData();
    formData.append("pdf", pdfBlob, `${form.employeeName}_form.pdf`);
    formData.append("data", JSON.stringify(form));

    // ✅ Retry logic for mobile networks
    let response;
    let lastError;
    const maxRetries = 3;
    // Debug: log which backend we're submitting to and online status
    try {
      console.log('Submitting to', api.defaults.baseURL || '(no baseURL)', 'online:', navigator.onLine);
    } catch (e) {
      console.log('Submitting (api not available)', e);
    }

    // Show an uploading modal so mobile users see progress
    const uploadingModal = Swal.fire({
      title: 'Uploading...',
      html: 'Please wait while we generate and upload your form.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Show progress on retries
        if (attempt > 1) {
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`);
        }
        
        response = await api.post("/submit-form", formData, {
          timeout: 120000, // 120 seconds for mobile
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
        break; // Success, exit loop
      } catch (err) {
        lastError = err;
        console.error(`❌ Attempt ${attempt} failed:`, err.message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const waitTime = 1000 * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (!response) {
      Swal.close();
      throw lastError || new Error("Form submission failed after retries");
    }

    Swal.close();
    if (response.data.loginCredentials) {
      await Swal.fire({
        title: "✅ Account Created Successfully!",
        html: `
          <div style="text-align: left; margin: 20px 0;">
            <p><strong>Your form has been submitted and account created.</strong></p>
            <p style="margin-top: 15px; padding: 12px; background-color: #f0f0f0; border-radius: 5px; border-left: 4px solid #1976d2;">
              <strong>Login Credentials:</strong><br/><br/>
              <span style="font-size: 14px;"><strong>Username:</strong></span> <code style="background-color: white; padding: 5px; border-radius: 3px;">${response.data.loginCredentials.username}</code><br/><br/>
              <span style="font-size: 14px;"><strong>Password:</strong></span> <code style="background-color: white; padding: 5px; border-radius: 3px;">${response.data.loginCredentials.password}</code>
            </p>
            <p style="margin-top: 15px; color: #d32f2f; font-size: 13px;"><strong>⚠️ Save these credentials. You'll need them to log in and change your password.</strong></p>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">You will be redirected to the login page.</p>
          </div>
        `,
        icon: "success",
        confirmButtonText: "Go to Login",
        confirmButtonColor: "#1976d2",
        allowOutsideClick: false,
        allowEscapeKey: false
      });
    } else {
      await Swal.fire({
        title: "Form Submitted",
        text: "Your form has been submitted successfully. Check your email or contact admin for login credentials.",
        icon: "success",
        confirmButtonText: "Go to Login"
      });
    }

    navigate("/login");

  } catch (err) {
    console.error("❌ Submission error:", err);
    console.error('submission response status:', err.response?.status, 'data:', err.response?.data);
    // Provide clearer feedback for file size errors
    if (err.response?.status === 413) {
      await Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'The generated PDF exceeds the maximum upload size allowed by the server. Try reducing the number of form pages or compressing the file before submitting again.',
      });
      return;
    }

    let errorMessage = "Submission failed.";
    const status = err.response?.status;

    if (err.response?.data?.error) {
      errorMessage = err.response.data.error;
    } else if (status === 408) {
      errorMessage = "Request timeout. The server timed out while processing your upload.";
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = "Request timeout. The network is slow. Please try again.";
    } else if (err.message === 'Network Error' || !navigator.onLine) {
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else if (status >= 400 && status < 500) {
      errorMessage = `Request failed (${status}). ${err.response?.data?.error || ''}`;
    } else if (status >= 500) {
      errorMessage = `Server error (${status}). Please try again later.`;
    } else if (err.message?.includes('413')) {
      errorMessage = "File too large. Try compressing the PDF.";
    } else if (err.message) {
      errorMessage = err.message;
    }

    // Show detailed hint and a copyable console message for debugging
    Swal.fire({
      title: 'Error',
      html: `<div>${errorMessage}</div><div style="margin-top:8px;font-size:12px;color:#666">(Open browser console for full details)</div>`,
      icon: 'error'
    });
  } finally {
    setLoading(false);
  }
};


  // ================= UI =================
  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center">
      <div className="bg-white shadow-lg w-full max-w-4xl p-6">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="italic text-sm">Employment and Labour Relations (General)</h1>
          <div className="border-b mt-2"></div>
        </div>

        <div className="flex justify-between text-sm mt-2">
          <span>G.N No. 47 (contd.)</span>
          <span className="font-bold">TUF. 15</span>
        </div>

        {/* FORM GRID - responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

          {["employeeName","employeeNumber","employerName","witness"].map(field => (
            <div key={field}>
              <label className="block text-xs font-bold uppercase mb-1">
                {field.replace(/([A-Z])/g," $1")}
              </label>
              <input
                name={field}
                value={form[field]}
                onChange={handleChange}
                className={`w-full border-b-2 p-2 ${errors[field] ? "border-red-500" : "border-gray-400"}`}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Trade Union Name</label>
            <div className="border-b-2 p-2 border-gray-400">FIBUCA</div>
          </div>

<div>
  <label className="block text-xs font-bold uppercase mb-1">
    Initial Monthly Union Dues
  </label>
  <select
    name="dues"
    value="1%"
    onChange={() => {}}
    className="w-full border-b-2 p-2 border-gray-400 bg-gray-100 text-gray-500 cursor-not-allowed"
    disabled
  >
    <option>1%</option>
  </select>
</div>

        </div>

        {/* SIGNATURE PREVIEW BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

          <SignatureBox
            label="Employee Signature"
            signature={employeeSignature}
            openModal={() => setEmployeeSigOpen(true)}
            error={errors.employeeSignature}
          />

          <SignatureBox
            label="Witness Signature"
            signature={witnessSignature}
            openModal={() => setWitnessSigOpen(true)}
            error={errors.witnessSignature}
          />

        </div>

        {/* SUBMIT */}
        <button
          onClick={generatePDF}
          disabled={loading}
          className="mt-8 w-full bg-blue-700 text-white py-3 rounded"
        >
          {loading ? <FaSpinner className="animate-spin mx-auto" /> : "Generate & Submit PDF"}
        </button>
      </div>

      {/* SIGNATURE MODALS */}
      {employeeSigOpen && (
        <SignatureModal
          close={() => setEmployeeSigOpen(false)}
          save={(img) => { setEmployeeSignature(img); setEmployeeSigOpen(false); }}
          sigPadRef={sigPadRef}
        />
      )}

      {witnessSigOpen && (
        <SignatureModal
          close={() => setWitnessSigOpen(false)}
          save={(img) => { setWitnessSignature(img); setWitnessSigOpen(false); }}
          sigPadRef={witnessSigPadRef}
        />
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function SignatureBox({ label, signature, openModal, error }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase mb-2">{label}</label>
      <div
        onClick={openModal}
        className="border-2 border-gray-400 h-20 flex items-center justify-center cursor-pointer bg-white"
      >
        {signature ? <img src={signature} alt="signature" className="h-14" /> : "Tap to Sign"}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SignatureModal({ close, save, sigPadRef }) {
  const handleClose = () => {
    Swal.fire({
      title: "Close without saving?",
      text: "Your signature will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, close",
      cancelButtonText: "Keep signing"
    }).then((result) => {
      if (result.isConfirmed) {
        close();
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white p-4 w-full max-w-lg rounded shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-center font-bold flex-1">Sign Below</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            title="Close"
          >
            ✕
          </button>
        </div>

        <SignatureCanvas
          ref={sigPadRef}
          penColor="black"
          canvasProps={{
            className: "border w-full h-60"
          }}
        />

        <div className="flex justify-between mt-4">
          <button onClick={() => sigPadRef.current.clear()} className="text-red-600 px-4 py-2">
            Clear
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="border border-gray-400 text-gray-700 px-4 py-2 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const img = sigPadRef.current
  .getTrimmedCanvas()
  .toDataURL("image/jpeg", 0.6); // compress to JPEG 60%
                save(img);
              }}
              className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
