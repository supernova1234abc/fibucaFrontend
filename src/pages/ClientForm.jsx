// ClientForm.jsx
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

  const [hasEmployeeSignature, setHasEmployeeSignature] = useState(false);
  const [hasWitnessSignature, setHasWitnessSignature] = useState(false);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showWitnessModal, setShowWitnessModal] = useState(false);

  const sigPadRef = useRef(null);
  const witnessSigPadRef = useRef(null);
  const [employeeSignatureData, setEmployeeSignatureData] = useState(null);
  const [witnessSignatureData, setWitnessSignatureData] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(f => ({ ...f, employeeDate: today, witnessDate: today }));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.employeeName.trim()) newErrors.employeeName = 'Employee name is required';
    if (!form.employeeNumber.trim()) newErrors.employeeNumber = 'Employee number is required';
    if (!form.employerName.trim()) newErrors.employerName = 'Employer name is required';
    if (!form.witness.trim()) newErrors.witness = 'Witness name is required';
    if (!hasEmployeeSignature) newErrors.employeeSignature = 'Employee signature is required';
    if (!hasWitnessSignature) newErrors.witnessSignature = 'Witness signature is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formValid =
    form.employeeName.trim() &&
    form.employeeNumber.trim() &&
    form.employerName.trim() &&
    form.witness.trim() &&
    hasEmployeeSignature &&
    hasWitnessSignature;

  const generatePDF = async () => {
    if (!validateForm()) {
      Swal.fire({ title: 'Missing Information', text: 'Please fix the highlighted fields.', icon: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = 30;

      // helper to load image from public folder
      const loadImageDataUrl = async (url) => {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      };

      // Try to draw sample form image as background to match desired output
      const bgData = await loadImageDataUrl('/images/sample form.JPG');
      if (bgData) {
        try {
          doc.addImage(bgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        } catch (e) {
          // ignore background if addImage fails
        }
      }

      // Title and centered fields
      doc.setFont('Times', 'bold');
      doc.setFontSize(13);
      doc.text("EMPLOYEE INSTRUCTION TO EMPLOYER TO DEDUCT DUES OF A REGISTERED TRADE UNION FROM EMPLOYEE’S WAGES", pageWidth / 2, currentY, { align: 'center' });
      currentY += 18;
      doc.setFont('Times', 'normal');
      doc.setFontSize(12);

      const drawCenteredField = (label, value) => {
        doc.text(`${label}: ${value}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;
      };

      drawCenteredField("EMPLOYEE’S NAME", form.employeeName);
      drawCenteredField("EMPLOYEE NUMBER", form.employeeNumber);
      drawCenteredField("EMPLOYER NAME", form.employerName);
      drawCenteredField("TRADE UNION NAME", "FIBUCA");
      drawCenteredField("INITIAL MONTHLY UNION DUES", form.dues);

      currentY += 18;

      // Employee signature box
      doc.text("Employee Signature", pageWidth / 2, currentY - 5, { align: 'center' });
      doc.rect(pageWidth / 2 - 50, currentY, 100, 40);
      if (hasEmployeeSignature && employeeSignatureData) {
        doc.addImage(employeeSignatureData, 'PNG', pageWidth / 2 - 48, currentY + 2, 96, 36);
      }
      doc.text(form.employeeDate, pageWidth / 2, currentY + 55, { align: 'center' });

      currentY += 80;

      // Witness signature box
      doc.text("Witness Signature", pageWidth / 2, currentY - 5, { align: 'center' });
      doc.rect(pageWidth / 2 - 50, currentY, 100, 40);
      if (hasWitnessSignature && witnessSignatureData) {
        doc.addImage(witnessSignatureData, 'PNG', pageWidth / 2 - 48, currentY + 2, 96, 36);
      }
      doc.text(form.witnessDate, pageWidth / 2, currentY + 55, { align: 'center' });

      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `${form.employeeName}_form.pdf`);
      formData.append('data', JSON.stringify(form));

      const res = await api.post('/submit-form', formData);
      const creds = res.data.loginCredentials;

      await api.post('/api/login', { employeeNumber: creds.username, password: creds.password }, { withCredentials: true });

      Swal.fire({
        title: 'Registered & Logged In!',
        html: `<p><b>Username:</b> ${creds.username}</p><p><b>Password:</b> ${creds.password}</p><p>Please save your credentials.</p>`,
        icon: 'success',
        confirmButtonText: 'Go to Dashboard'
      }).then(() => navigate('/client'));

    } catch (err) {
      Swal.fire({ title: 'Submission Failed', text: err.response?.data?.error || err.message || 'Unexpected error occurred.', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-700">FIBUCA Union Form</h2>
          <Link to="/" className="text-blue-500 text-sm hover:underline">← Home</Link>
        </div>

        {[
          { name: 'employeeName', label: 'Employee Name' },
          { name: 'employeeNumber', label: 'Employee Number' },
          { name: 'employerName', label: 'Employer Name' },
          { name: 'witness', label: 'Witness Name' }
        ].map(({ name, label }) => (
          <div className="mb-4" key={name}>
            <label htmlFor={name} className="font-medium text-gray-700">{label}</label>
            <input
              id={name}
              name={name}
              value={form[name]}
              onChange={handleChange}
              disabled={loading}
              className={`w-full p-3 border rounded-md ${errors[name] ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors[name] && <p className="text-red-600 text-sm">{errors[name]}</p>}
          </div>
        ))}

        {/* Employee Signature Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowEmployeeModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Employee Signature
          </button>
          {errors.employeeSignature && <p className="text-red-600 text-sm">{errors.employeeSignature}</p>}
        </div>

        {/* Witness Signature Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowWitnessModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Witness Signature
          </button>
          {errors.witnessSignature && <p className="text-red-600 text-sm">{errors.witnessSignature}</p>}
        </div>

        <button
          onClick={generatePDF}
          disabled={!formValid || loading}
          className={`w-full py-3 rounded-md text-white font-semibold ${loading || !formValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <FaSpinner className="animate-spin" /> Submitting…
            </span>
          ) : (
            'Generate & Submit PDF'
          )}
        </button>

        {/* Employee Signature Modal */}
        {showEmployeeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded w-11/12 max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">Employee Signature</h3>
                <button onClick={() => setShowEmployeeModal(false)} className="text-gray-600">Close</button>
              </div>
              <div className="border rounded">
                <SignatureCanvas ref={sigPadRef} penColor="black" canvasProps={{width: 500, height: 180, className: 'w-full'}} />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    sigPadRef.current?.clear();
                    setEmployeeSignatureData(null);
                    setHasEmployeeSignature(false);
                  }}
                  className="bg-gray-200 px-3 py-1 rounded"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
                      Swal.fire({ icon: 'warning', title: 'No signature', text: 'Please sign before saving.' });
                      return;
                    }
                    const data = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
                    setEmployeeSignatureData(data);
                    setHasEmployeeSignature(true);
                    setShowEmployeeModal(false);
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Witness Signature Modal */}
        {showWitnessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded w-11/12 max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">Witness Signature</h3>
                <button onClick={() => setShowWitnessModal(false)} className="text-gray-600">Close</button>
              </div>
              <div className="border rounded">
                <SignatureCanvas ref={witnessSigPadRef} penColor="black" canvasProps={{width: 500, height: 180, className: 'w-full'}} />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    witnessSigPadRef.current?.clear();
                    setWitnessSignatureData(null);
                    setHasWitnessSignature(false);
                  }}
                  className="bg-gray-200 px-3 py-1 rounded"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (!witnessSigPadRef.current || witnessSigPadRef.current.isEmpty()) {
                      Swal.fire({ icon: 'warning', title: 'No signature', text: 'Please sign before saving.' });
                      return;
                    }
                    const data = witnessSigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
                    setWitnessSignatureData(data);
                    setHasWitnessSignature(true);
                    setShowWitnessModal(false);
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
        </div>
  );
}
