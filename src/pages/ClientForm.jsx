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
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setHasEmployeeSignature(false);
    }
  };

  const clearWitnessSignature = () => {
    if (witnessSigPadRef.current) {
      witnessSigPadRef.current.clear();
      setHasWitnessSignature(false);
    }
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

  // ================= PDF GENERATION =================
  const generatePDF = async () => {
    if (!validateForm()) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please complete all required fields.',
        icon: 'warning'
      });
      return;
    }

    setLoading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;
      const margin = 20;
      let y = 20;

      // ===== Header =====
      doc.setFont('Times', 'italic');
      doc.setFontSize(12);
      doc.text('Employment and Labour Relations (General)', centerX, y, { align: 'center' });
      y += 4;
      doc.line(margin, y, pageWidth - margin, y);

      y += 15;

      doc.setFont('Times', 'bold');
      doc.setFontSize(14);
      doc.text(
        'EMPLOYEE INSTRUCTION TO EMPLOYER TO DEDUCT DUES\nOF A REGISTERED TRADE UNION FROM EMPLOYEE’S WAGES',
        centerX,
        y,
        { align: 'center' }
      );

      y += 15;

      doc.setFont('Times', 'italic');
      doc.setFontSize(11);
      doc.text('(Made under Regulation 34(1))', centerX, y, { align: 'center' });

      y += 15;

      doc.setFont('Times', 'normal');
      doc.setFontSize(12);

      const drawField = (label, value) => {
        doc.text(`${label}:`, margin, y);
        doc.text(value, margin + 55, y);
        doc.line(margin + 55, y + 1, pageWidth - margin, y + 1);
        y += 10;
      };

      drawField("EMPLOYEE’S NAME", form.employeeName);
      drawField("EMPLOYEE NUMBER", form.employeeNumber);
      drawField("EMPLOYER NAME", form.employerName);
      drawField("TRADE UNION NAME", "FIBUCA");
      drawField("INITIAL MONTHLY UNION DUES", form.dues);

      y += 10;

      // ===== Declaration Clauses =====
      const clauses = [
        "1. I the above mentioned employee hereby instruct my employer to deduct monthly from my wages, trade union dues owing to my union.",
        "2. I agree that the amount deducted may from time to time be increased, provided that I am given written notification of this in advance.",
        "3. I confirm my understanding that I am entitled at any stage to cancel this instruction by giving one month’s written notice to my trade union and my employer."
      ];

      clauses.forEach(text => {
        const split = doc.splitTextToSize(text, pageWidth - margin * 2);
        doc.text(split, margin, y);
        y += split.length * 7;
        y += 3;
      });

      y += 10;

      // ===== Signatures =====
      doc.line(margin, y, margin + 60, y);
      doc.text('Employee Signature', margin, y + 5);
      doc.addImage(sigPadRef.current.toDataURL(), 'PNG', margin, y - 20, 50, 15);
      doc.text(form.employeeDate, pageWidth - 60, y);

      y += 30;

      doc.line(margin, y, margin + 60, y);
      doc.text('Witness Name & Signature', margin, y + 5);
      doc.text(form.witness, margin, y - 5);
      doc.addImage(witnessSigPadRef.current.toDataURL(), 'PNG', margin + 70, y - 20, 50, 15);
      doc.text(form.witnessDate, pageWidth - 60, y);

      // ===== Send to Backend =====
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `${form.employeeName}_form.pdf`);
      formData.append('data', JSON.stringify(form));

      const res = await api.post('/submit-form', formData);
      const creds = res.data.loginCredentials;

      await api.post(
        '/api/login',
        { employeeNumber: creds.username, password: creds.password },
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
        <div className="flex justify-between items-center p-6 border-b-2 border-gray-300">
          <h1 className="text-sm italic">Employment and Labour Relations (General)</h1>
          <Link to="/" className="text-blue-500 text-sm hover:underline">
            ← Home
          </Link>
        </div>

        <div className="p-8 space-y-8">
          {/* Fields */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <Input label="Employee Name" name="employeeName" form={form} handleChange={handleChange} errors={errors} loading={loading} />
              <Input label="Employee Number" name="employeeNumber" form={form} handleChange={handleChange} errors={errors} loading={loading} />
              <Input label="Employer Name" name="employerName" form={form} handleChange={handleChange} errors={errors} loading={loading} />
            </div>

            <div className="space-y-6">
              <StaticField label="Trade Union Name" value="FIBUCA" />
              <SelectField form={form} handleChange={handleChange} loading={loading} />
              <Input label="Witness Name" name="witness" form={form} handleChange={handleChange} errors={errors} loading={loading} />
            </div>
          </div>

          {/* Declaration Text */}
          <div className="text-sm leading-relaxed border-t pt-6 space-y-3">
            <p>1. I the above mentioned employee hereby instruct my employer to deduct monthly from my wages, trade union dues owing to my union.</p>
            <p>2. I agree that the amount deducted may from time to time be increased, provided that I am given written notification of this in advance.</p>
            <p>3. I confirm my understanding that I am entitled at any stage to cancel this instruction by giving one month’s written notice to my trade union and my employer.</p>
          </div>

          {/* Signatures */}
          <SignatureSection
            sigPadRef={sigPadRef}
            witnessSigPadRef={witnessSigPadRef}
            setHasEmployeeSignature={setHasEmployeeSignature}
            setHasWitnessSignature={setHasWitnessSignature}
            clearSignature={clearSignature}
            clearWitnessSignature={clearWitnessSignature}
            errors={errors}
            form={form}
            handleChange={handleChange}
            loading={loading}
          />

          {/* Submit */}
          <button
            onClick={generatePDF}
            disabled={!formValid || loading}
            className={`w-full py-3 rounded-md text-white font-semibold ${
              loading || !formValid ? 'bg-gray-400' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Generate & Submit PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Reusable Components ===== */

function Input({ label, name, form, handleChange, errors, loading }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-2 uppercase">{label}</label>
      <input
        name={name}
        value={form[name]}
        onChange={handleChange}
        disabled={loading}
        className={`w-full p-2 border-b-2 ${errors[name] ? 'border-red-500' : 'border-gray-400'} bg-transparent`}
      />
      {errors[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </div>
  );
}

function StaticField({ label, value }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-2 uppercase">{label}</label>
      <div className="w-full p-2 border-b-2 border-gray-400">{value}</div>
    </div>
  );
}

function SelectField({ form, handleChange, loading }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-2 uppercase">Initial Monthly Union Dues</label>
      <select
        name="dues"
        value={form.dues}
        onChange={handleChange}
        disabled={loading}
        className="w-full p-2 border-b-2 border-gray-400 bg-transparent"
      >
        <option>1%</option>
        <option>1.5%</option>
        <option>2%</option>
        <option>2.5%</option>
      </select>
    </div>
  );
}

function SignatureSection({
  sigPadRef,
  witnessSigPadRef,
  setHasEmployeeSignature,
  setHasWitnessSignature,
  clearSignature,
  clearWitnessSignature,
  errors,
  form,
  handleChange,
  loading
}) {
  return (
    <div className="grid grid-cols-2 gap-8 border-t pt-8">
      <div>
        <label className="block text-xs font-bold mb-3 uppercase">Employee Signature</label>
        <SignatureCanvas
          ref={sigPadRef}
          penColor="black"
          onEnd={() => setHasEmployeeSignature(true)}
          canvasProps={{ width: 250, height: 80, className: 'border-2 border-gray-400 bg-white' }}
        />
        {errors.employeeSignature && <p className="text-red-600 text-xs mt-1">{errors.employeeSignature}</p>}
        <button onClick={clearSignature} className="text-xs text-red-600 mt-2">Clear</button>

        <input
          type="date"
          name="employeeDate"
          value={form.employeeDate}
          onChange={handleChange}
          disabled={loading}
          className="w-full mt-4 p-2 border-b-2 border-gray-400 bg-transparent"
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-3 uppercase">Witness Signature</label>
        <SignatureCanvas
          ref={witnessSigPadRef}
          penColor="black"
          onEnd={() => setHasWitnessSignature(true)}
          canvasProps={{ width: 250, height: 80, className: 'border-2 border-gray-400 bg-white' }}
        />
        {errors.witnessSignature && <p className="text-red-600 text-xs mt-1">{errors.witnessSignature}</p>}
        <button onClick={clearWitnessSignature} className="text-xs text-red-600 mt-2">Clear</button>

        <input
          type="date"
          name="witnessDate"
          value={form.witnessDate}
          onChange={handleChange}
          disabled={loading}
          className="w-full mt-4 p-2 border-b-2 border-gray-400 bg-transparent"
        />
      </div>
    </div>
  );
}
