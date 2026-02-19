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

    // Show agreement confirmation
    const agreements = `
      <div style="text-align: left; padding: 15px;">
        <p><strong>By submitting this form, you agree to:</strong></p>
        <div style="margin-top: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 5px;">
          <p>1. I hereby instruct my employer to deduct union dues monthly from my wages.</p>
          <p>2. I agree that deductions may be adjusted with written notice.</p>
          <p>3. I may cancel this instruction by giving one month written notice to my trade union and employer.</p>
        </div>
      </div>
    `;

    const confirmAgreement = await Swal.fire({
      title: "Confirm Agreement",
      html: agreements,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "I Agree & Submit",
      cancelButtonText: "Cancel"
    });

    if (!confirmAgreement.isConfirmed) return;

    setLoading(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // HEADER
      doc.setFont("Times", "italic");
      doc.setFontSize(12);
      doc.text("Employment and Labour Relations (General)", pageWidth / 2, y, { align: "center" });

      y += 6;
      doc.line(margin, y, pageWidth - margin, y);

      y += 5;

      // G.N No and TUF placement
      doc.setFont("Times", "italic");
      doc.setFontSize(11);
      doc.text("G.N No. 47 (contd.)", margin, y);
      doc.setFont("Times", "bold");
      doc.text("TUF. 15", pageWidth - margin, y, { align: "right" });

      y += 12;

      // TITLE
      doc.setFont("Times", "normal");
      doc.setFontSize(13);
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

      doc.setFont("Times", "normal");
      doc.setFontSize(12);

      // Regular fields - left-aligned with slight padding (looks like someone filled it)
      const drawField = (label, value) => {
        const fieldStart = margin + 55;
        const fieldWidth = pageWidth - margin - fieldStart;
        const fieldPos = fieldStart + fieldWidth * 0.15; // 15% offset from left (slight padding)
        
        doc.text(`${label}:`, margin, y);
        doc.text(value, fieldPos, y); // ✅ LEFT-ALIGNED WITH PADDING
        doc.line(fieldStart, y + 1, pageWidth - margin, y + 1);
        y += 10;
      };

      // Dues field - centered (for fixed values like "1%")
      const drawCenteredField = (label, value) => {
        const fieldStart = margin + 60;
        const fieldWidth = pageWidth - margin - fieldStart;
        const fieldCenter = fieldStart + fieldWidth / 2;
        
        doc.text(`${label}:`, margin, y);
        doc.text(value, fieldCenter, y, { align: "center" }); // ✅ CENTERED
        doc.line(fieldStart, y + 1, pageWidth - margin, y + 1);
        y += 10;
      };

      drawField("EMPLOYEE'S NAME", form.employeeName);
      drawField("EMPLOYEE NUMBER", form.employeeNumber);
      drawField("EMPLOYER NAME", form.employerName);
      drawField("TRADE UNION NAME", "FIBUCA");
      drawCenteredField("INITIAL MONTHLY UNION DUES", form.dues);

      y += 8;

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

      y += 10;

      // SIGNATURE CENTERING
      const signWidth = 50;
      const signHeight = 15;

      // Employee signature line
      doc.line(margin, y, margin + 60, y);
      const empX = margin + (60 - signWidth) / 2;
      doc.addImage(employeeSignature, "PNG", empX, y - signHeight, signWidth, signHeight);
      doc.text(form.employeeDate, pageWidth - margin, y, { align: "right" });

      y += 25;

      // Witness signature line
      doc.line(margin, y, margin + 60, y);
      const witX = margin + (60 - signWidth) / 2;
      doc.addImage(witnessSignature, "PNG", witX, y - signHeight, signWidth, signHeight);
      doc.text(form.witnessDate, pageWidth - margin, y, { align: "right" });

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("pdf", pdfBlob, `${form.employeeName}_form.pdf`);
      formData.append("data", JSON.stringify(form));

      const response = await api.post("/submit-form", formData);

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
      
      let errorMessage = "Submission failed.";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your connection and try again.";
      }
      
      Swal.fire("Error", errorMessage, "error");
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
                const img = sigPadRef.current.toDataURL();
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
