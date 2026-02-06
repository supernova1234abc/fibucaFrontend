// clientForm.jsx
import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import { api } from '../lib/api';

import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaSpinner } from 'react-icons/fa';

export default function ClientForm() {
  const [form, setForm] = useState({
    employeeName: '',
    employeeNumber: '',
    employerName: '',
    dues: '1%',
    witness: '',
    employeeDate: '',
    witnessDate: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const sigPadRef = useRef(null);
  const witnessSigPadRef = useRef(null);

  const navigate = useNavigate();

  // Set default dates
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(f => ({
      ...f,
      employeeDate: today,
      witnessDate: today
    }));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const clearSignature = () => {
    sigPadRef.current.clear();
    setErrors(prev => ({ ...prev, employeeSignature: null }));
  };

  const clearWitnessSignature = () => {
    witnessSigPadRef.current.clear();
    setErrors(prev => ({ ...prev, witnessSignature: null }));
  };

  // ================= VALIDATION =================
  const validateForm = () => {
    const newErrors = {};

    if (!form.employeeName.trim())
      newErrors.employeeName = 'Employee name is required';

    if (!form.employeeNumber.trim())
      newErrors.employeeNumber = 'Employee number is required';

    if (!form.employerName.trim())
      newErrors.employerName = 'Employer name is required';

    if (!form.witness.trim())
      newErrors.witness = 'Witness name is required';

    if (sigPadRef.current?.isEmpty())
      newErrors.employeeSignature = 'Employee signature is required';

    if (witnessSigPadRef.current?.isEmpty())
      newErrors.witnessSignature = 'Witness signature is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formValid =
    form.employeeName.trim() &&
    form.employeeNumber.trim() &&
    form.employerName.trim() &&
    form.witness.trim() &&
    !sigPadRef.current?.isEmpty() &&
    !witnessSigPadRef.current?.isEmpty();

  // ================= PDF + SUBMIT =================
  const generatePDF = async () => {
    if (!validateForm()) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please correct the highlighted fields before submitting.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    setLoading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const xCenter = pageWidth / 2;
      const x = 20;
      let currentY = 20;

      doc.setFont("Times", "italic");
      doc.setFontSize(12);
      doc.text("Employment and Labour Relations (General)", xCenter, currentY, { align: 'center' });
      doc.line(x, currentY + 1, pageWidth - x, currentY + 1);

      currentY += 15;
      doc.text(" G.N.No.47(contd..) ", x, currentY);
      doc.text(" TUF.15 ", pageWidth - 40, currentY + 10);

      currentY += 25;
      doc.setFont("Times", "normal");
      doc.text("EMPLOYEE INSTRUCTION TO EMPLOYER TO DEDUCT DUES OF A REGISTERED", xCenter, currentY, { align: 'center' });
      currentY += 6;
      doc.text("TRADE UNION FROM EMPLOYEE’S WAGES", xCenter, currentY, { align: 'center' });
      currentY += 6;
      doc.setFont("Times", "italic");
      doc.text("(Made under Regulation 34(1))", xCenter, currentY, { align: 'center' });

      currentY += 15;
      doc.setFont("Times", "normal");
      doc.setFontSize(13);

      const drawField = (label, value) => {
        const labelWidth = doc.getTextWidth(`${label}:`);
        doc.text(`${label}:`, x, currentY);
        doc.text(value, x + labelWidth + 2, currentY);
        doc.line(x + labelWidth + 2, currentY + 1, pageWidth - x, currentY + 1);
        currentY += 10;
      };

      drawField("EMPLOYEE’S NAME", form.employeeName);
      drawField("EMPLOYEE NUMBER", form.employeeNumber);
      drawField("EMPLOYER NAME", form.employerName);
      drawField("TRADE UNION NAME", "FIBUCA");
      drawField("INITIAL MONTHLY UNION DUES", form.dues);

      currentY += 8;

      const addParagraph = (num, text) => {
        const lines = doc.splitTextToSize(text, pageWidth - 60);
        doc.text(`${num}.`, x, currentY);
        lines.forEach(line => {
          doc.text(line, xCenter, currentY, { align: 'center' });
          currentY += 8;
        });
        currentY += 4;
      };

      addParagraph(1, "I, the above-mentioned employee, hereby instruct my employer to deduct monthly from my wages trade union dues owing to my union.");
      addParagraph(2, "I agree that the amount deducted may from time to time be increased, provided that I am given written notification of this in advance.");
      addParagraph(3, "I confirm my understanding that I am entitled at any stage to cancel this instruction by giving one month’s written notice to my trade union and my employer.");

      currentY += 12;

      // Employee signature
      doc.line(x, currentY, x + 70, currentY);
      doc.text("Employee Signature", x, currentY + 5);
      doc.addImage(sigPadRef.current.getCanvas().toDataURL(), 'PNG', x + 2, currentY - 12, 40, 12);

      doc.text(form.employeeDate, pageWidth - 80, currentY - 5);

      currentY += 20;

      // Witness
      doc.line(x, currentY, x + 70, currentY);
      doc.text("Witness Name", x, currentY + 5);
      doc.text(form.witness, x + 2, currentY - 5);

      doc.addImage(witnessSigPadRef.current.getCanvas().toDataURL(), 'PNG', x + 82, currentY - 12, 40, 12);
      doc.text(form.witnessDate, pageWidth - 80, currentY - 5);

      const pdfBlob = doc.output('blob');

      const formData = new FormData();
      formData.append('pdf', pdfBlob, `${form.employeeName}_form.pdf`);
      formData.append('data', JSON.stringify(form));

      const res = await api.post('/submit-form', formData);
      const creds = res.data.loginCredentials;

      await api.post('/api/login', {
        employeeNumber: creds.username,
        password: creds.password
      }, { withCredentials: true });

      Swal.fire({
        title: 'Registered & Logged In!',
        html: `
          <p><strong>Username:</strong> ${creds.username}</p>
          <p><strong>Password:</strong> ${creds.password}</p>
          <p>Please save your credentials.</p>
        `,
        icon: 'success',
        confirmButtonText: 'Go to Dashboard'
      }).then(() => navigate('/client'));

    } catch (error) {
      Swal.fire({
        title: 'Submission Failed',
        text: error.response?.data?.error || 'Unexpected error occurred.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-700">FIBUCA Union Form</h2>
          <Link to="/" className="text-blue-500 hover:underline text-sm">← Home</Link>
        </div>

        {[
          { name: "employeeName", label: "Employee Name" },
          { name: "employeeNumber", label: "Employee Number" },
          { name: "employerName", label: "Employer Name" },
          { name: "witness", label: "Witness Name" }
        ].map(({ name, label }) => (
          <div className="mb-4" key={name}>
            <label className="block text-gray-700 mb-1 font-medium">{label}</label>
            <input
              name={name}
              value={form[name]}
              onChange={handleChange}
              disabled={loading}
              className={`w-full p-3 border rounded-md focus:outline-none
                ${errors[name] ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors[name] && <p className="text-red-600 text-sm mt-1">{errors[name]}</p>}
          </div>
        ))}

        <div className="mb-6">
          <label className="font-medium">Employee Signature</label>
          <SignatureCanvas
            ref={sigPadRef}
            penColor="black"
            canvasProps={{ width: 300, height: 100, className: "border rounded-md" }}
          />
          {errors.employeeSignature && <p className="text-red-600 text-sm">{errors.employeeSignature}</p>}
          <button onClick={clearSignature} className="text-sm text-red-600 mt-1">Clear</button>
        </div>

        <div className="mb-6">
          <label className="font-medium">Witness Signature</label>
          <SignatureCanvas
            ref={witnessSigPadRef}
            penColor="black"
            canvasProps={{ width: 300, height: 100, className: "border rounded-md" }}
          />
          {errors.witnessSignature && <p className="text-red-600 text-sm">{errors.witnessSignature}</p>}
          <button onClick={clearWitnessSignature} className="text-sm text-red-600 mt-1">Clear</button>
        </div>

        <button
          onClick={generatePDF}
          disabled={!formValid || loading}
          className={`w-full py-3 rounded-md text-white font-semibold ${
            loading || !formValid ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Generate & Submit PDF'}
        </button>
      </div>
    </div>
  );
}
