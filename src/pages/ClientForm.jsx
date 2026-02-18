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
      let currentY = 20;

      // Title centered
      doc.setFont('Times', 'bold');
      doc.setFontSize(14);
      doc.text(
        "EMPLOYEE INSTRUCTION TO EMPLOYER TO DEDUCT DUES OF A REGISTERED TRADE UNION FROM EMPLOYEE’S WAGES",
        pageWidth / 2,
        currentY,
        { align: 'center' }
      );

      currentY += 20;
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

      currentY += 20;

      // Employee signature box
      doc.text("Employee Signature", pageWidth / 2, currentY - 5, { align: 'center' });
      doc.rect(pageWidth / 2 - 50, currentY, 100, 40);
      if (hasEmployeeSignature) {
        doc.addImage(sigPadRef.current.getCanvas().toDataURL(), 'PNG', pageWidth / 2 - 48, currentY + 2, 96, 36);
      }
      doc.text(form.employeeDate, pageWidth / 2, currentY + 55, { align: 'center' });

      currentY += 80;

      // Witness signature box
      doc.text("Witness Signature", pageWidth / 2, currentY - 5, { align: 'center' });
      doc.rect(pageWidth / 2 - 50, currentY, 100, 40);
      if (hasWitnessSignature) {
        doc.addImage(witnessSigPadRef.current.getCanvas().toDataURL(), 'PNG', pageWidth / 2 - 48, currentY + 2, 96, 36);
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

        </div>
        </div>
  );
}
