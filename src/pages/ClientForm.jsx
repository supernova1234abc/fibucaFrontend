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
    witness: "",
    employeeDate: "",
    witnessDate: ""
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
  };

  const validate = () => {
    const e = {};
    if (!form.employeeName) e.employeeName = true;
    if (!form.employeeNumber) e.employeeNumber = true;
    if (!form.employerName) e.employerName = true;
    if (!form.witness) e.witness = true;
    if (!employeeSignature) e.employeeSignature = true;
    if (!witnessSignature) e.witnessSignature = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Trim transparent space from signature
  const trimSignature = (dataURL) => {
    const img = new Image();
    img.src = dataURL;
    return new Promise(resolve => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;

        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            if (pixels[index + 3] > 0) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        const trimmedWidth = maxX - minX;
        const trimmedHeight = maxY - minY;

        const trimmedCanvas = document.createElement("canvas");
        trimmedCanvas.width = trimmedWidth;
        trimmedCanvas.height = trimmedHeight;

        trimmedCanvas.getContext("2d").drawImage(
          canvas,
          minX, minY,
          trimmedWidth, trimmedHeight,
          0, 0,
          trimmedWidth, trimmedHeight
        );

        resolve(trimmedCanvas.toDataURL());
      };
    });
  };

  const confirmAgreements = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Confirm Agreement",
      html: `
        <p style="text-align:left;font-size:14px">
        1. I the above mentioned employee hereby instruct my employer to deduct monthly from my wages, trade union dues owing to my union.<br><br>
        2. I agree that the amount deducted may from time to time be increased, provided that I am given written notification of this in advance.<br><br>
        3. I confirm my understanding that I am entitled at any stage to cancel this instruction by giving one month’s written notice to my trade union and my employer.
        </p>
      `,
      confirmButtonText: "I Agree & Submit",
      showCancelButton: true
    });

    return isConfirmed;
  };

  const generatePDF = async () => {
    if (!validate()) return;

    const agreed = await confirmAgreements();
    if (!agreed) return;

    setLoading(true);

    try {
      const trimmedEmployee = await trimSignature(employeeSignature);
      const trimmedWitness = await trimSignature(witnessSignature);

      const doc = new jsPDF("p", "mm", "a4");
      const w = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      doc.setFont("Times", "italic");
      doc.text("Employment and Labour Relations (General)", w / 2, y, { align: "center" });
      y += 6;
      doc.line(margin, y, w - margin, y);
      y += 5;

      doc.setFont("Times", "italic");
      doc.text("G.N No. 47 (contd.)", margin, y);
      doc.setFont("Times", "normal");
      doc.text("TUF. 15", w - margin, y, { align: "right" });
      y += 12;

      doc.setFont("Times", "bold");
      doc.text(
        "EMPLOYEE INSTRUCTION TO EMPLOYER TO DEDUCT DUES OF A REGISTERED TRADE UNION FROM EMPLOYEE’S WAGES",
        w / 2,
        y,
        { align: "center", maxWidth: 170 }
      );
      y += 10;

      doc.setFont("Times", "italic");
      doc.text("(Made under Regulation 34(1))", w / 2, y, { align: "center" });
      y += 15;

      doc.setFont("Times", "normal");

      const field = (label, value) => {
        doc.text(label, margin, y);
        doc.text(value, margin + 60, y);
        doc.line(margin + 60, y + 1, w - margin, y + 1);
        y += 10;
      };

      field("EMPLOYEE’S NAME:", form.employeeName);
      field("EMPLOYEE NUMBER:", form.employeeNumber);
      field("EMPLOYER NAME:", form.employerName);
      field("TRADE UNION NAME:", "FIBUCA");
      field("INITIAL MONTHLY UNION DUES:", "1%");

      y += 15;

      const signWidth = 45;
      const signHeight = 15;

      // Employee
      doc.text("Employee Signature", margin, y);
      doc.line(margin, y + 5, margin + 60, y + 5);
      doc.addImage(trimmedEmployee, "PNG",
        margin + (60 - signWidth) / 2,
        y - 8,
        signWidth,
        signHeight
      );

      doc.text("Date:", w - 60, y);
      doc.line(w - 45, y + 5, w - margin, y + 5);
      doc.text(form.employeeDate, w - 43, y);

      y += 25;

      // Witness
      doc.text("Witness Name & Signature", margin, y);
      doc.line(margin, y + 5, margin + 60, y + 5);
      doc.addImage(trimmedWitness, "PNG",
        margin + (60 - signWidth) / 2,
        y - 8,
        signWidth,
        signHeight
      );

      doc.text("Date:", w - 60, y);
      doc.line(w - 45, y + 5, w - margin, y + 5);
      doc.text(form.witnessDate, w - 43, y);

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("pdf", pdfBlob);
      formData.append("data", JSON.stringify(form));

      const res = await api.post("/submit-form", formData);
      const creds = res.data.loginCredentials;

      await Swal.fire({
        title: "Registration Successful",
        html: `
          <b>Username:</b> ${creds.username}<br>
          <b>Password:</b> ${creds.password}<br><br>
          Please save these credentials.
        `,
        icon: "success"
      });

      navigate("/login");

    } catch {
      Swal.fire("Error", "Submission failed", "error");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center">
      <div className="bg-white w-full max-w-4xl p-6 shadow-lg">

        <div className="text-center italic text-sm">
          Employment and Labour Relations (General)
        </div>
        <div className="border-b mt-2"></div>

        <div className="flex justify-between text-sm mt-2">
          <span className="italic">G.N No. 47 (contd.)</span>
          <span>TUF. 15</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {["employeeName","employeeNumber","employerName","witness"].map(f => (
            <div key={f}>
              <label className="text-xs font-bold uppercase">{f}</label>
              <input
                name={f}
                value={form[f]}
                onChange={handleChange}
                className="w-full border-b-2 p-2 border-gray-400"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-bold uppercase">Trade Union Name</label>
            <div className="border-b-2 p-2 text-gray-500">FIBUCA</div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase">Initial Monthly Union Dues</label>
            <div className="border-b-2 p-2 text-gray-500">1%</div>
          </div>
        </div>

        <button
          onClick={generatePDF}
          disabled={loading}
          className="mt-8 w-full bg-blue-700 text-white py-3 rounded"
        >
          {loading ? <FaSpinner className="animate-spin mx-auto"/> : "Generate & Submit"}
        </button>
      </div>
    </div>
  );
}
