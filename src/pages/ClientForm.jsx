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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-700">
            FIBUCA Union Form
          </h2>
          <Link to="/" className="text-blue-500 text-sm hover:underline">
            ← Home
          </Link>
        </div>

        {[
          { name: 'employeeName', label: 'Employee Name' },
          { name: 'employeeNumber', label: 'Employee Number' },
          { name: 'employerName', label: 'Employer Name' },
          { name: 'witness', label: 'Witness Name' }
        ].map(({ name, label }) => (
          <div className="mb-4" key={name}>
            <label className="font-medium text-gray-700">{label}</label>
            <input
              name={name}
              value={form[name]}
              onChange={handleChange}
              disabled={loading}
              className={`w-full p-3 border rounded-md ${
                errors[name] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors[name] && (
              <p className="text-red-600 text-sm">{errors[name]}</p>
            )}
          </div>
        ))}

        {/* Employee Signature */}
        <div className="mb-6">
          <label className="font-medium">Employee Signature</label>
          <SignatureCanvas
            ref={sigPadRef}
            penColor="black"
            onEnd={() => {
              setHasEmployeeSignature(!sigPadRef.current.isEmpty());
              setErrors(prev => ({ ...prev, employeeSignature: null }));
            }}
            canvasProps={{
              width: 300,
              height: 100,
              className: 'border rounded-md'
            }}
          />
          {errors.employeeSignature && (
            <p className="text-red-600 text-sm">
              {errors.employeeSignature}
            </p>
          )}
          <button
            onClick={clearSignature}
            className="text-sm text-red-600 mt-1"
          >
            Clear
          </button>
        </div>

        {/* Witness Signature */}
        <div className="mb-6">
          <label className="font-medium">Witness Signature</label>
          <SignatureCanvas
            ref={witnessSigPadRef}
            penColor="black"
            onEnd={() => {
              setHasWitnessSignature(!witnessSigPadRef.current.isEmpty());
              setErrors(prev => ({ ...prev, witnessSignature: null }));
            }}
            canvasProps={{
              width: 300,
              height: 100,
              className: 'border rounded-md'
            }}
          />
          {errors.witnessSignature && (
            <p className="text-red-600 text-sm">
              {errors.witnessSignature}
            </p>
          )}
          <button
            onClick={clearWitnessSignature}
            className="text-sm text-red-600 mt-1"
          >
            Clear
          </button>
        </div>

        <button
          onClick={generatePDF}
          disabled={!formValid || loading}
          className={`w-full py-3 rounded-md text-white font-semibold ${
            loading || !formValid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
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
  );
}
