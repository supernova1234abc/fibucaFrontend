// src/pages/ClientForm.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { FaSpinner } from "react-icons/fa";
import { api } from "../lib/api";

export default function ClientForm() {
  const navigate = useNavigate();
  const { token } = useParams();

  // ======= FORM STATE =======
  const [form, setForm] = useState({
    employeeName: "",
    employeeNumber: "",
    employerName: "",
    branchName: "",     // ✅ DB only, not PDF
    phoneNumber: "",    // ✅ DB only, not PDF
    dues: "1%",
    witness: "",
    employeeDate: "",
    witnessDate: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  // ======= SIGNATURE STATE =======
  const [employeeSigOpen, setEmployeeSigOpen] = useState(false);
  const [witnessSigOpen, setWitnessSigOpen] = useState(false);
  const [employeeSignature, setEmployeeSignature] = useState(null);
  const [witnessSignature, setWitnessSignature] = useState(null);

  const sigPadRef = useRef(null);
  const witnessSigPadRef = useRef(null);

  // ======= TOKEN VALIDATION =======
  useEffect(() => {
    if (!token) {
      console.warn("❌ ClientForm: No token in URL");
      setTokenValid(false);
      return;
    }

    console.log("🔍 ClientForm: Validating token:", token);

    api
      .get(`/api/staff/validate/${token}`)
      .then((res) => {
        console.log("✅ ClientForm: Token validated successfully", res.data);
        setTokenValid(true);
      })
      .catch((err) => {
        console.error("❌ ClientForm: Token validation failed");
        console.error("Error details:", {
          message: err.message,
          status: err.response?.status,
          error: err.response?.data?.error,
          details: err.response?.data?.details,
          data: err.response?.data,
        });
        setTokenValid(false);
      });
  }, [token]);

  // ======= DEFAULT DATES =======
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setForm((f) => ({ ...f, employeeDate: today, witnessDate: today }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: null,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.employeeName.trim()) newErrors.employeeName = "Required";
    if (!form.employeeNumber.trim()) newErrors.employeeNumber = "Required";
    if (!form.employerName.trim()) newErrors.employerName = "Required";
    if (!form.phoneNumber.trim()) newErrors.phoneNumber = "Required";
    if (!form.witness.trim()) newErrors.witness = "Required";
    if (!employeeSignature) newErrors.employeeSignature = "Required";
    if (!witnessSignature) newErrors.witnessSignature = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ======= PDF GENERATION & SUBMIT =======
  const generatePDF = async () => {
    if (!validate()) {
      Swal.fire("Missing Information", "Please complete all required fields.", "warning");
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
      confirmButtonText: "I Agree & Submit",
    });

    if (!confirmAgreement.isConfirmed) return;

    setLoading(true);

    try {
      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // ======= HEADER =======
      doc.setFont("Times", "italic");
      doc.setFontSize(12);
      doc.text("Employment and Labour Relations (General)", pageWidth / 2, y, {
        align: "center",
      });
      y += 3;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFontSize(11);
      doc.text("G.N No. 47 (contd.)", margin, y);
      doc.setFont("Times", "bold");
      doc.text("TUF. 15", pageWidth - margin, y, { align: "right" });
      y += 12;

      // ======= TITLE =======
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
      doc.text("(Made under Regulation 34(1))", pageWidth / 2, y, {
        align: "center",
      });
      y += 15;

      // ======= FORM FIELDS =======
      // NOTE:
      // branchName and phoneNumber are intentionally NOT printed to the PDF.
      doc.setFont("Times", "normal");

      const drawField = (label, value) => {
        const labelText = `${label}:`;
        doc.text(labelText, margin, y);

        const labelWidth =
          (doc.getStringUnitWidth(labelText) * doc.internal.getFontSize()) /
          doc.internal.scaleFactor;

        const lineStart = margin + labelWidth + 3;
        doc.line(lineStart, y + 1, pageWidth - margin, y + 1);
        doc.text(String(value || ""), lineStart + 8, y);
        y += 8;
      };

      drawField("EMPLOYEE'S NAME", form.employeeName);
      drawField("EMPLOYEE NUMBER", form.employeeNumber);
      drawField("EMPLOYER NAME", form.employerName);
      drawField("TRADE UNION NAME", "FIBUCA");

      const duesLabel = "INITIAL MONTHLY UNION DUES:";
      const labelWidth =
        (doc.getStringUnitWidth(duesLabel) * doc.internal.getFontSize()) /
        doc.internal.scaleFactor;
      const duesStart = margin + labelWidth + 5;

      doc.text(duesLabel, margin, y);
      doc.line(duesStart, y + 1, pageWidth - margin, y + 1);
      doc.text(form.dues, (duesStart + pageWidth - margin) / 2, y, {
        align: "center",
      });
      y += 15;

      // ======= CLAUSES =======
      const clauses = [
        "1. I the above mentioned employee hereby instruct my employer to deduct monthly from my wages, trade union dues owing to my union.",
        "2. I agree that the amount deducted may from time to time be increased, provided that I am given written notification of this in advance.",
        "3. I confirm my understanding that I am entitled at any stage to cancel this instruction by giving one month’s written notice to my trade union and my employer.",
      ];

      clauses.forEach((text) => {
        const split = doc.splitTextToSize(text, pageWidth - margin * 2);
        doc.text(split, margin, y);
        y += split.length * 6 + 4;
      });

      y += 15;

      // ======= SIGNATURE SECTION =======
      const lineWidth = 55;
      const dateWidth = 35;
      const signHeight = 10;
      const signWidth = 30;

      // EMPLOYEE
      const empSignStart = margin;
      const empSignEnd = empSignStart + lineWidth;
      const empDateEnd = pageWidth - margin;
      const empDateStart = empDateEnd - dateWidth;

      doc.line(empSignStart, y, empSignEnd, y);
      doc.line(empDateStart, y, empDateEnd, y);

      const empImgX = empSignStart + (lineWidth - signWidth) / 2;
      doc.addImage(employeeSignature, "PNG", empImgX, y - signHeight, signWidth, signHeight);

      doc.setFontSize(11);
      doc.setFont("Times", "normal");
      doc.text(form.employeeDate, empDateStart + dateWidth / 2, y - 1, {
        align: "center",
      });

      y += 6;
      doc.setFontSize(10);
      doc.text("Employee Signature", empSignStart + lineWidth / 2, y, {
        align: "center",
      });
      doc.text("Date", empDateStart + dateWidth / 2, y, { align: "center" });

      // WITNESS
      y += 14;
      const witSignStart = margin;
      const witSignEnd = witSignStart + lineWidth;
      const witDateEnd = pageWidth - margin;
      const witDateStart = witDateEnd - dateWidth;

      doc.line(witSignStart, y, witSignEnd, y);
      doc.line(witDateStart, y, witDateEnd, y);

      doc.setFontSize(11);
      doc.setFont("Times", "normal");
      doc.text(form.witness, witSignStart + 5, y);

      const witImgX = witSignStart + (lineWidth - signWidth) / 2;
      doc.addImage(witnessSignature, "PNG", witImgX, y - signHeight, signWidth, signHeight);

      doc.text(form.witnessDate, witDateStart + dateWidth / 2, y - 1, {
        align: "center",
      });

      y += 6;
      doc.setFontSize(10);
      doc.text("Witness Name and Signature", witSignStart + lineWidth / 2, y, {
        align: "center",
      });
      doc.text("Date", witDateStart + dateWidth / 2, y, { align: "center" });

      // ======= UPLOAD =======
      const pdfBlob = doc.output("blob", { compress: true });
      const formData = new FormData();
      formData.append("pdf", pdfBlob, `${form.employeeName}_form.pdf`);
      formData.append("data", JSON.stringify(form)); // includes branchName + phoneNumber for DB

      console.log("🔍 Token check during submit:", { token: !!token, full: token });

      if (!token) {
        Swal.close();
        throw new Error(
          "❌ Staff link token missing. Please use a valid staff link to submit."
        );
      }

      let response;
      let lastError;
      const maxRetries = 3;

      console.log(
        "✅ Token found, starting upload to /submit-form/" + token.substring(0, 8) + "..."
      );

      Swal.fire({
        title: "Uploading...",
        html: "Please wait while we generate and upload your form.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`);
          }

          response = await api.post(`/submit-form/${token}`, formData, {
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          });

          break;
        } catch (err) {
          lastError = err;
          console.error(`❌ Attempt ${attempt} failed:`, err.message);

          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
          }
        }
      }

      Swal.close();

      if (!response) {
        throw lastError || new Error("Form submission failed after retries");
      }

      // ======= SUCCESS =======
      if (response.data.loginCredentials) {
        await Swal.fire({
          title: "Account Created Successfully!",
          html: `<div style="text-align: left; margin: 20px 0;">
            <p><strong>Your form has been submitted and account created.</strong></p>
            <p style="margin-top: 15px; padding: 12px; background-color: #f0f0f0; border-radius: 5px; border-left: 4px solid #1976d2;">
              <strong>Login Credentials:</strong><br/><br/>
              <span style="font-size: 14px;"><strong>Username:</strong></span> <code style="background-color: white; padding: 5px; border-radius: 3px;">${response.data.loginCredentials.username}</code><br/><br/>
              <span style="font-size: 14px;"><strong>Password:</strong></span> <code style="background-color: white; padding: 5px; border-radius: 3px;">${response.data.loginCredentials.password}</code>
            </p>
            <p style="margin-top: 15px; color: #d32f2f; font-size: 13px;"><strong>⚠️ Save these credentials. You'll need them to log in and change your password.</strong></p>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">You will be redirected to the login page.</p>
          </div>`,
          icon: "success",
          confirmButtonText: "Go to Login",
          confirmButtonColor: "#1976d2",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });
      } else {
        await Swal.fire({
          title: "Form Submitted",
          text: "Your form has been submitted successfully. Check your email or contact admin for login credentials.",
          icon: "success",
          confirmButtonText: "Go to Login",
        });
      }

      navigate("/login");
    } catch (err) {
      console.error("❌ Submission error:", err);

      let errorMessage = "Submission failed.";
      const status = err.response?.status;

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (status === 408 || err.code === "ECONNABORTED") {
        errorMessage = "Request timeout. Try again.";
      } else if (err.message === "Network Error" || !navigator.onLine) {
        errorMessage = "Network error. Check your connection.";
      } else if (status >= 400 && status < 500) {
        errorMessage = `Request failed (${status}).`;
      } else if (status >= 500) {
        errorMessage = `Server error (${status}).`;
      }

      Swal.fire({
        title: "Error",
        html: `<div>${errorMessage}</div>`,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const mainFields = [
    { name: "employeeName", label: "Employee Name", required: true },
    { name: "employeeNumber", label: "Employee Number", required: true },
    { name: "employerName", label: "Employer Name", required: true },
    { name: "branchName", label: "Branch Name (Optional)", required: false },
    { name: "phoneNumber", label: "Phone Number", required: true },
    { name: "witness", label: "Witness", required: true },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-10 px-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl p-8">
        <div className="text-center">
          <h1 className="italic text-sm">Employment and Labour Relations (General)</h1>
          <div className="border-b mt-2"></div>
        </div>

        <div className="flex justify-between text-sm mt-2">
          <span>G.N No. 47 (contd.)</span>
          <span className="font-bold">TUF. 15</span>
        </div>

        {/* FORM GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {mainFields.map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-bold uppercase mb-1">
                {field.label}
              </label>
              <input
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                className={`w-full border-b-2 p-2 ${
                  errors[field.name] ? "border-red-500" : "border-gray-400"
                }`}
                placeholder={field.label}
              />
              {errors[field.name] && (
                <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Trade Union Name
            </label>
            <div className="border-b-2 p-2 border-gray-400">FIBUCA</div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Initial Monthly Union Dues
            </label>
            <select
              value="1%"
              disabled
              className="w-full border-b-2 p-2 border-gray-400 bg-gray-100 text-gray-500 cursor-not-allowed"
            >
              <option>1%</option>
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          Branch name and phone number are collected for system records and communication.
          They will not appear in the generated PDF.
        </div>

        {/* SIGNATURE BOXES */}
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
        {!tokenValid && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-center">
            <p className="font-semibold">🔒 Staff Authorization Required</p>
            <p className="text-sm">
              This form can only be submitted using a valid staff link.
            </p>
          </div>
        )}

        <button
          onClick={() => {
            if (!tokenValid) {
              Swal.fire({
                title: "Restricted Access",
                text: "You need a valid staff link to submit this form.",
                icon: "warning",
                confirmButtonText: "Login Instead",
                confirmButtonColor: "#2563eb",
              }).then(() => navigate("/login"));
              return;
            }

            generatePDF();
          }}
          disabled={loading}
          className={`mt-8 w-full py-3 rounded font-semibold transition ${
            tokenValid
              ? "bg-blue-700 text-white hover:bg-blue-800 cursor-pointer"
              : "bg-gray-300 text-gray-600 hover:bg-gray-400 cursor-pointer"
          }`}
        >
          {loading ? (
            <FaSpinner className="animate-spin mx-auto" />
          ) : tokenValid ? (
            "Generate & Submit PDF"
          ) : (
            "Staff Link Required"
          )}
        </button>
      </div>

      {/* SIGNATURE MODALS */}
      {employeeSigOpen && (
        <SignatureModal
          close={() => setEmployeeSigOpen(false)}
          save={(img) => {
            setEmployeeSignature(img);
            setEmployeeSigOpen(false);
          }}
          sigPadRef={sigPadRef}
        />
      )}

      {witnessSigOpen && (
        <SignatureModal
          close={() => setWitnessSigOpen(false)}
          save={(img) => {
            setWitnessSignature(img);
            setWitnessSigOpen(false);
          }}
          sigPadRef={witnessSigPadRef}
        />
      )}
    </div>
  );
}

// ======= SIGNATURE COMPONENTS =======
function SignatureBox({ label, signature, openModal, error }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase mb-2">{label}</label>
      <div
        onClick={openModal}
        className="border-2 border-gray-400 h-20 flex items-center justify-center cursor-pointer bg-white"
      >
        {signature ? (
          <img src={signature} alt="signature" className="h-14" />
        ) : (
          "Tap to Sign"
        )}
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
    }).then((res) => {
      if (res.isConfirmed) close();
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded p-4 w-96">
        <h2 className="text-center font-bold mb-2">Sign Below</h2>
        <SignatureCanvas
          ref={sigPadRef}
          penColor="black"
          canvasProps={{ className: "border border-gray-400 w-full h-48" }}
        />
        <div className="flex justify-between mt-4">
          <button
            onClick={() => sigPadRef.current.clear()}
            className="px-4 py-2 border rounded"
          >
            Clear
          </button>
          <button
            onClick={() => save(sigPadRef.current.toDataURL("image/png"))}
            className="px-4 py-2 bg-blue-700 text-white rounded"
          >
            Save
          </button>
          <button onClick={handleClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}