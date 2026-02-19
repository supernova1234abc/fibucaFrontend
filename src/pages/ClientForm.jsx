import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
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
    Object.keys(form).forEach(key => {
      if (!form[key]) newErrors[key] = "Required";
    });
    if (!employeeSignature) newErrors.employeeSignature = "Required";
    if (!witnessSignature) newErrors.witnessSignature = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= PDF GENERATION ================= */

  const generatePDF = async () => {
    if (!validate()) {
      Swal.fire("Missing Information", "Please complete all fields.", "warning");
      return;
    }

    const agreements = `
1. I hereby instruct my employer to deduct union dues monthly.
2. I agree that deductions may be adjusted with written notice.
3. I may cancel this instruction by giving one month written notice.
    `;

    const confirm = await Swal.fire({
      title: "Agreement Confirmation",
      html: `<div style="text-align:left">${agreements.replace(/\n/g, "<br/>")}</div>`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "I Agree & Submit"
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      doc.setFont("Times", "italic");
      doc.text("Employment and Labour Relations (General)", pageWidth / 2, y, { align: "center" });

      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFont("Times", "italic");
      doc.text("G.N No 47 (contd)", margin, y);

      doc.setFont("Times", "normal");
      doc.text("TUF. 15", pageWidth - margin, y, { align: "right" });

      y += 15;

      doc.setFont("Times", "bold");
      doc.text(
        "EMPLOYEE INSTRUCTION TO EMPLOYER TO DEDUCT DUES",
        pageWidth / 2,
        y,
        { align: "center", maxWidth: 170 }
      );

      y += 15;
      doc.setFont("Times", "normal");

      const drawField = (label, value) => {
        doc.text(`${label}:`, pageWidth / 2, y, { align: "center" });
        y += 6;
        doc.text(value, pageWidth / 2, y, { align: "center" });
        doc.line(margin, y + 1, pageWidth - margin, y + 1);
        y += 10;
      };

      drawField("EMPLOYEE NAME", form.employeeName);
      drawField("EMPLOYEE NUMBER", form.employeeNumber);
      drawField("EMPLOYER NAME", form.employerName);
      drawField("TRADE UNION NAME", "FIBUCA");

      // 1% centered & grey
      doc.setTextColor(150);
      drawField("INITIAL MONTHLY UNION DUES", form.dues);
      doc.setTextColor(0);

      y += 5;

      const clauses = [
        "1. I hereby instruct my employer to deduct union dues monthly.",
        "2. I agree deductions may be adjusted with written notice.",
        "3. I may cancel this instruction with one month notice."
      ];

      clauses.forEach(text => {
        const split = doc.splitTextToSize(text, 160);
        doc.text(split, pageWidth / 2, y, { align: "center" });
        y += split.length * 6 + 4;
      });

      y += 15;

      const signWidth = 50;
      const signHeight = 20;

      doc.text("Employee Signature:", margin, y);
      doc.addImage(employeeSignature, "PNG", margin + 5, y + 5, signWidth, signHeight);
      doc.line(margin + 70, y + 20, pageWidth - margin, y + 20);
      doc.text("Date", pageWidth - margin - 15, y + 25);
      doc.text(form.employeeDate, pageWidth - margin, y + 25, { align: "right" });

      y += 40;

      doc.text("Witness Name:", margin, y);
      doc.text(form.witness, margin + 40, y);

      y += 10;

      doc.text("Witness Signature:", margin, y);
      doc.addImage(witnessSignature, "PNG", margin + 5, y + 5, signWidth, signHeight);
      doc.line(margin + 70, y + 20, pageWidth - margin, y + 20);
      doc.text("Date", pageWidth - margin - 15, y + 25);
      doc.text(form.witnessDate, pageWidth - margin, y + 25, { align: "right" });

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("pdf", pdfBlob);
      formData.append("data", JSON.stringify(form));

      const response = await api.post("/submit-form", formData);

      await Swal.fire({
        title: "Account Created",
        html: `
          <b>Username:</b> ${response.data.username}<br/>
          <b>Default Password:</b> ${response.data.password}
        `,
        icon: "success"
      });

      navigate("/login");

    } catch (err) {
      Swal.fire("Error", "Submission failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center">
      <div className="bg-white shadow-lg w-full max-w-4xl p-6">

        <div className="text-center">
          <h1 className="italic text-sm">Employment and Labour Relations (General)</h1>
          <div className="border-b mt-2"></div>
        </div>

        <div className="flex justify-between text-sm mt-2">
          <span className="italic">G.N No 47 (contd)</span>
          <span>TUF. 15</span>
        </div>

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
            <label className="block text-xs font-bold uppercase mb-1">Initial Monthly Union Dues</label>
            <div className="border-b-2 p-2 text-center text-gray-400">
              1%
            </div>
          </div>
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

        <button
          onClick={generatePDF}
          disabled={loading}
          className="mt-8 w-full bg-blue-700 text-white py-3 rounded"
        >
          {loading ? <FaSpinner className="animate-spin mx-auto" /> : "Generate & Submit PDF"}
        </button>
      </div>

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
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white p-4 w-full max-w-lg rounded shadow-lg">
        <h2 className="text-center font-bold mb-4">Sign Below</h2>

        <SignatureCanvas
          ref={sigPadRef}
          penColor="black"
          velocityFilterWeight={0.7}
          minWidth={1}
          maxWidth={2.5}
          canvasProps={{
            className: "border w-full h-60"
          }}
        />

        <div className="flex justify-between mt-4">
          <button onClick={() => sigPadRef.current.clear()} className="text-red-600">
            Clear
          </button>
          <button
            onClick={() => {
              const img = sigPadRef.current.toDataURL();
              save(img);
            }}
            className="bg-blue-700 text-white px-4 py-2 rounded"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
