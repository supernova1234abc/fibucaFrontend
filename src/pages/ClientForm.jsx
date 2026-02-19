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

  // 🔑 signature state (THIS fixes the bug)
  const [hasEmployeeSignature, setHasEmployeeSignature] = useState(false);
  const [hasWitnessSignature, setHasWitnessSignature] = useState(false);

  const sigPadRef = useRef(null);
  const witnessSigPadRef = useRef(null);

  const navigate = useNavigate();

  // ================= DEFAULT DATES =================
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(f => ({
      ...f,
      employeeDate: today,
      witnessDate: today
    }));
  }, []);

  // ================= HANDLERS =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const clearSignature = () => {
    sigPadRef.current.clear();
    setHasEmployeeSignature(false);
    setErrors(prev => ({ ...prev, employeeSignature: null }));
  };

  const clearWitnessSignature = () => {
    witnessSigPadRef.current.clear();
    setHasWitnessSignature(false);
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

    if (!hasEmployeeSignature)
      newErrors.employeeSignature = 'Employee signature is required';

    if (!hasWitnessSignature)
      newErrors.witnessSignature = 'Witness signature is required';

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

  // ================= SUBMIT + PDF =================
  const generatePDF = async () => {
    if (!validateForm()) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please fix the highlighted fields.',
        icon: 'warning'
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

      doc.setFont('Times', 'italic');
      doc.setFontSize(12);
      doc.text(
        'Employment and Labour Relations (General)',
        xCenter,
        currentY,
        { align: 'center' }
      );
      doc.line(x, currentY + 1, pageWidth - x, currentY + 1);

      currentY += 15;
      doc.setFont('Times', 'normal');
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

      currentY += 10;

      doc.line(x, currentY, x + 70, currentY);
      doc.text("Employee Signature", x, currentY + 5);
      doc.addImage(
        sigPadRef.current.getCanvas().toDataURL(),
        'PNG',
        x + 2,
        currentY - 12,
        40,
        12
      );
      doc.text(form.employeeDate, pageWidth - 80, currentY - 5);

      currentY += 20;

      doc.line(x, currentY, x + 70, currentY);
      doc.text("Witness Name", x, currentY + 5);
      doc.text(form.witness, x + 2, currentY - 5);
      doc.addImage(
        witnessSigPadRef.current.getCanvas().toDataURL(),
        'PNG',
        x + 82,
        currentY - 12,
        40,
        12
      );
      doc.text(form.witnessDate, pageWidth - 80, currentY - 5);

      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `${form.employeeName}_form.pdf`);
      formData.append('data', JSON.stringify(form));

      const res = await api.post('/submit-form', formData);
      const creds = res.data.loginCredentials;

      await api.post(
        '/api/login',
        {
          employeeNumber: creds.username,
          password: creds.password
        },
        { withCredentials: true }
      );

      Swal.fire({
        title: 'Registered & Logged In!',
        html: `
          <p><b>Username:</b> ${creds.username}</p>
          <p><b>Password:</b> ${creds.password}</p>
          <p>Please save your credentials.</p>
        `,
        icon: 'success',
        confirmButtonText: 'Go to Dashboard'
      }).then(() => navigate('/client'));

    } catch (err) {
      Swal.fire({
        title: 'Submission Failed',
        text: err.response?.data?.error || 'Unexpected error occurred.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center px-4 py-8">
      <div className="bg-white shadow-xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-2 border-gray-300">
          <div className="flex-1">
            <h1 className="text-sm italic font-medium text-gray-700">
              Employment and Labour Relations (General)
            </h1>
          </div>
          <Link to="/" className="text-blue-500 text-sm hover:underline ml-4">
            ← Home
          </Link>
        </div>

        <div className="p-8">
          {/* A4-style layout matching PDF format */}
          
          {/* Form Fields Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                  Employee's Name
                </label>
                <input
                  name="employeeName"
                  value={form.employeeName}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full p-2 border-b-2 ${
                    errors.employeeName ? 'border-red-500' : 'border-gray-400'
                  } focus:outline-none focus:border-blue-600 bg-transparent text-sm`}
                />
                {errors.employeeName && (
                  <p className="text-red-600 text-xs mt-1">{errors.employeeName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                  Employee Number
                </label>
                <input
                  name="employeeNumber"
                  value={form.employeeNumber}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full p-2 border-b-2 ${
                    errors.employeeNumber ? 'border-red-500' : 'border-gray-400'
                  } focus:outline-none focus:border-blue-600 bg-transparent text-sm`}
                />
                {errors.employeeNumber && (
                  <p className="text-red-600 text-xs mt-1">{errors.employeeNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                  Employer Name
                </label>
                <input
                  name="employerName"
                  value={form.employerName}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full p-2 border-b-2 ${
                    errors.employerName ? 'border-red-500' : 'border-gray-400'
                  } focus:outline-none focus:border-blue-600 bg-transparent text-sm`}
                />
                {errors.employerName && (
                  <p className="text-red-600 text-xs mt-1">{errors.employerName}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                  Trade Union Name
                </label>
                <div className="w-full p-2 border-b-2 border-gray-400 bg-transparent text-sm text-gray-700">
                  FIBUCA
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                  Initial Monthly Union Dues
                </label>
                <select
                  name="dues"
                  value={form.dues}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full p-2 border-b-2 border-gray-400 focus:outline-none focus:border-blue-600 bg-transparent text-sm"
                >
                  <option>1%</option>
                  <option>1.5%</option>
                  <option>2%</option>
                  <option>2.5%</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                  Witness Name
                </label>
                <input
                  name="witness"
                  value={form.witness}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full p-2 border-b-2 ${
                    errors.witness ? 'border-red-500' : 'border-gray-400'
                  } focus:outline-none focus:border-blue-600 bg-transparent text-sm`}
                />
                {errors.witness && (
                  <p className="text-red-600 text-xs mt-1">{errors.witness}</p>
                )}
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-gray-300 pt-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Employee Signature */}
              <div>
                <div className="mb-4">
                  <label className="block text-xs uppercase font-bold text-gray-700 mb-3">
                    Employee Signature
                  </label>
                  <SignatureCanvas
                    ref={sigPadRef}
                    penColor="black"
                    onEnd={() => {
                      setHasEmployeeSignature(!sigPadRef.current.isEmpty());
                      setErrors(prev => ({ ...prev, employeeSignature: null }));
                    }}
                    canvasProps={{
                      width: 250,
                      height: 80,
                      className: 'border-2 border-gray-400 rounded-sm bg-white'
                    }}
                  />
                  {errors.employeeSignature && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.employeeSignature}
                    </p>
                  )}
                  <button
                    onClick={clearSignature}
                    className="text-xs text-red-600 mt-2 hover:underline"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="mt-4 pt-2 border-t-2 border-gray-400">
                  <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    name="employeeDate"
                    type="date"
                    value={form.employeeDate}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full p-2 border-b-2 border-gray-400 focus:outline-none focus:border-blue-600 bg-transparent text-sm"
                  />
                </div>
              </div>

              {/* Witness Signature */}
              <div>
                <div className="mb-4">
                  <label className="block text-xs uppercase font-bold text-gray-700 mb-3">
                    Witness Signature
                  </label>
                  <SignatureCanvas
                    ref={witnessSigPadRef}
                    penColor="black"
                    onEnd={() => {
                      setHasWitnessSignature(!witnessSigPadRef.current.isEmpty());
                      setErrors(prev => ({ ...prev, witnessSignature: null }));
                    }}
                    canvasProps={{
                      width: 250,
                      height: 80,
                      className: 'border-2 border-gray-400 rounded-sm bg-white'
                    }}
                  />
                  {errors.witnessSignature && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.witnessSignature}
                    </p>
                  )}
                  <button
                    onClick={clearWitnessSignature}
                    className="text-xs text-red-600 mt-2 hover:underline"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="mt-4 pt-2 border-t-2 border-gray-400">
                  <label className="block text-xs uppercase font-bold text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    name="witnessDate"
                    type="date"
                    value={form.witnessDate}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full p-2 border-b-2 border-gray-400 focus:outline-none focus:border-blue-600 bg-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={generatePDF}
              disabled={!formValid || loading}
              className={`flex-1 py-3 rounded-md text-white font-semibold uppercase text-sm tracking-wide ${
                loading || !formValid
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
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
      </div>
    </div>
  );
}