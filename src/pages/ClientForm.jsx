// src/pages/ClientForm.jsx
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

  const [loading, setLoading] = useState(false);
  const sigPadRef = useRef();
  const witnessSigPadRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(f => ({ ...f, employeeDate: today, witnessDate: today }));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const clearSignature = () => sigPadRef.current.clear();
  const clearWitnessSignature = () => witnessSigPadRef.current.clear();

  const generatePDF = async () => {
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

      currentY += 25;
      doc.setFont("Times", "normal");
      doc.setFontSize(12);

      const drawLabel = (label, value) => {
        doc.text(`${label}: ${value}`, x, currentY);
        currentY += 10;
      };

      drawLabel("EMPLOYEE NAME", form.employeeName);
      drawLabel("EMPLOYEE NUMBER", form.employeeNumber);
      drawLabel("EMPLOYER NAME", form.employerName);
      drawLabel("TRADE UNION NAME", "FIBUCA");
      drawLabel("INITIAL MONTHLY DUES", form.dues);

      // Employee Signature
      if (!sigPadRef.current.isEmpty()) {
        const signatureImage = sigPadRef.current.getCanvas().toDataURL('image/png');
        doc.addImage(signatureImage, 'PNG', x, currentY, 50, 20);
      }
      doc.text("Employee Date: " + form.employeeDate, x + 100, currentY + 10);
      currentY += 30;

      // Witness Signature
      if (!witnessSigPadRef.current.isEmpty()) {
        const witnessImage = witnessSigPadRef.current.getCanvas().toDataURL('image/png');
        doc.addImage(witnessImage, 'PNG', x, currentY, 50, 20);
      }
      doc.text("Witness Name: " + form.witness, x + 100, currentY + 10);
      doc.text("Witness Date: " + form.witnessDate, x + 100, currentY + 20);

      // Prepare FormData
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `${form.employeeName}_form.pdf`);
      formData.append('data', JSON.stringify(form));

      // Submit to backend
      const res = await api.post('/submit-form', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const creds = res.data.loginCredentials;

      // Auto-login
      if (creds) {
        try {
          await api.post('/api/login', {
            employeeNumber: creds.username,
            password: creds.password
          }, { withCredentials: true });

          Swal.fire({
            title: 'Registered & Logged In!',
            html: `
              <p><strong>Username:</strong> ${creds.username}</p>
              <p><strong>Password:</strong> ${creds.password}</p>
              <h3>Please save your credentials</h3>
            `,
            icon: 'success',
            confirmButtonText: 'Go to Dashboard'
          }).then(() => navigate('/client'));
        } catch (loginErr) {
          Swal.fire({
            title: 'Registered! Please Login',
            html: `
              <p><strong>Username:</strong> ${creds.username}</p>
              <p><strong>Password:</strong> ${creds.password}</p>
              <h3>Use these credentials to login</h3>
            `,
            icon: 'success',
            confirmButtonText: 'Proceed to Login'
          }).then(() => navigate('/login'));
        }
      } else {
        Swal.fire({
          title: 'Submission Successful!',
          text: 'Your form was submitted and placeholder ID card created.',
          icon: 'success',
          confirmButtonText: 'Go to Dashboard'
        }).then(() => navigate('/client'));
      }

    } catch (err) {
      console.error('Submission error:', err);
      Swal.fire({
        title: 'Submission Failed',
        text: err.response?.data?.error || 'Unexpected error occurred',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-700">FIBUCA Union Form</h2>
          <Link to="/" className="text-blue-500 hover:underline text-sm">← Home</Link>
        </div>

        {['employeeName','employeeNumber','employerName','witness'].map(field => (
          <div className="mb-4" key={field}>
            <label className="block text-gray-700 mb-1 font-medium">{field.replace(/([A-Z])/g, ' $1')}</label>
            <input
              name={field}
              value={form[field]}
              onChange={handleChange}
              disabled={loading}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">Employee Signature</label>
          <SignatureCanvas
            penColor="black"
            canvasProps={{ width: 300, height: 100, className: "border border-gray-300 rounded-md bg-white" }}
            ref={sigPadRef}
          />
          <button onClick={clearSignature} disabled={loading} className="mt-2 text-sm text-red-600 hover:underline">Clear</button>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">Witness Signature</label>
          <SignatureCanvas
            penColor="black"
            canvasProps={{ width: 300, height: 100, className: "border border-gray-300 rounded-md bg-white" }}
            ref={witnessSigPadRef}
          />
          <button onClick={clearWitnessSignature} disabled={loading} className="mt-2 text-sm text-red-600 hover:underline">Clear</button>
        </div>

        <button
          onClick={generatePDF}
          disabled={loading}
          className={`w-full mt-6 py-3 rounded-md font-semibold text-white ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? <span className="flex items-center justify-center gap-2"><FaSpinner className="animate-spin" /> Submitting…</span> : 'Generate & Submit PDF'}
        </button>
      </div>
    </div>
  );
}
