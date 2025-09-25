//clientForm.jsx
import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import { api } from '../lib/api'      // ← add this

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
    setForm(f => ({
      ...f,
      employeeDate: today,
      witnessDate: today
    }));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const clearSignature = () => sigPadRef.current.clear();
  const clearWitnessSignature = () => witnessSigPadRef.current.clear();

  const generatePDF = async () => {
    setLoading(true);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const xCenter = pageWidth / 2;
    const x = 20;
    let currentY = 20;

    doc.setFont("Times", "italic");
    doc.setFontSize(12);
    doc.text("Employment and Labour Relations (General)", xCenter, currentY, { align: 'center' });
    doc.setLineWidth(0.2);
    doc.line(x, currentY + 1, pageWidth - x, currentY + 1);

    currentY += 15;
    doc.setFontSize(12);
    doc.text(" G.N.No.47(contd..) ", x, currentY);
    doc.text(" TUF.15 ", pageWidth - 40, currentY + 10);

    currentY += 25;
    doc.setFontSize(12);
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

    const drawLabelWithUnderline = (label, value) => {
      const labelText = `${label}:`;
      const labelWidth = doc.getTextWidth(labelText);
      const valueX = x + labelWidth + 2;
      doc.text(labelText, x, currentY);
      doc.text(value, valueX, currentY);
      doc.line(valueX, currentY + 1, pageWidth - x, currentY + 1);
      currentY += 10;
    };

    drawLabelWithUnderline("EMPLOYEE’S NAME", form.employeeName);
    drawLabelWithUnderline("EMPLOYEE NUMBER", form.employeeNumber);
    drawLabelWithUnderline("EMPLOYER NAME", form.employerName);
    drawLabelWithUnderline("TRADE UNION NAME", "FIBUCA");
    drawLabelWithUnderline("INITIAL MONTHLY UNION DUES", form.dues);

    const addParagraph = (num, text) => {
      const lines = doc.splitTextToSize(text, pageWidth - 60);
      doc.text(`${num}.`, x + 5, currentY);
      lines.forEach(line => {
        doc.text(line, xCenter, currentY, { align: 'center' });
        currentY += 8;
      });
      currentY += 4;
    };

    addParagraph(1, "I, the above-mentioned employee, hereby instruct my employer to deduct monthly from my wages trade union dues owing to my union.");
    addParagraph(2, "I agree that the amount deducted may from time to time be increased, provided that I am given written notification of this in advance.");
    addParagraph(3, "I confirm my understanding that I am entitled at any stage to cancel this instruction by giving one month’s written notice to my trade union and my employer.");

    currentY += 10;
    const leftX = x;
    const rightX = pageWidth - 90;

    doc.line(leftX, currentY, leftX + 70, currentY);
    doc.text("Employee Signature", leftX, currentY + 5);
    if (!sigPadRef.current.isEmpty()) {
      const signatureImage = sigPadRef.current.getCanvas().toDataURL('image/png');
      doc.addImage(signatureImage, 'PNG', leftX + 2, currentY - 12, 40, 12);
    }

    doc.line(rightX, currentY, rightX + 70, currentY);
    doc.text("Date", rightX, currentY + 5);
    doc.text(form.employeeDate, rightX + 10, currentY - 5);

    currentY += 20;
    doc.line(leftX, currentY, leftX + 70, currentY);
    doc.text("Witness Name", leftX, currentY + 5);
    doc.text(form.witness, leftX + 2, currentY - 5);

    doc.text("Signature", leftX + 80, currentY + 5);
    if (!witnessSigPadRef.current.isEmpty()) {
      const witnessImage = witnessSigPadRef.current.getCanvas().toDataURL('image/png');
      doc.addImage(witnessImage, 'PNG', leftX + 82, currentY - 12, 40, 12);
    }

    doc.line(rightX, currentY, rightX + 70, currentY);
    doc.text("Date", rightX, currentY + 5);
    doc.text(form.witnessDate, rightX + 10, currentY - 5);

    const pdfBlob = doc.output('blob');
    const formData = new FormData();
    formData.append('pdf', pdfBlob, `${form.employeeName}_form.pdf`);
    formData.append('data', JSON.stringify(form));

    try {
      const res = await api.post('/submit-form', formData);
      const creds = res.data.loginCredentials;

      // Auto-login after registration
      try {
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
            <p><strong>Username:</strong> ${creds.username}</p>
            <p><strong>Password:</strong> ${creds.password}</p>
            <h3>You are now logged in. Please save your credentials.</h3>
          `,
          icon: 'success',
          confirmButtonText: 'Go to Dashboard'
        }).then(() => {
          navigate('/client');
        });
      } catch (loginErr) {
        // fallback: show credentials and go to login page
        Swal.fire({
          title: 'Registered! Please Login',
          html: `
            <p><strong>Username:</strong> ${creds.username}</p>
            <p><strong>Password:</strong> ${creds.password}</p>
            <h3>Please copy these credentials and use them to login</h3>
          `,
          icon: 'success',
          confirmButtonText: 'Proceed to login'
        }).then(() => {
          navigate('/login');
        });
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        Swal.fire({
          title: 'Submission Failed',
          text: error.response.data?.error || 'A user with this employee number already exists.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      } else {
        console.error('Error submitting form:', error);
        Swal.fire({
          title: 'Submission Failed',
          text: 'An unexpected error occurred. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
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

        {[{ name: "employeeName", label: "Employee Name" }, { name: "employeeNumber", label: "Employee Number" }, { name: "employerName", label: "Employer Name" }, { name: "witness", label: "Witness Name" }].map(({ name, label }) => (
          <div className="mb-4" key={name}>
            <label className="block text-gray-700 mb-1 font-medium">{label}</label>
            <input
              name={name}
              placeholder={label}
              value={form[name]}
              onChange={handleChange}
              disabled={loading}
              className="w-full p-3 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
        ))}

        <div className="mb-4">
          <label className="block text-gray-700 mb-1 font-medium">Union Dues (fixed)</label>
          <input
            name="dues"
            value={form.dues}
            disabled
            className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md shadow-sm cursor-not-allowed text-gray-500"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">Employee Signature</label>
          <div className="w-full overflow-x-auto">
            <SignatureCanvas
              penColor="black"
              canvasProps={{
                width: 300,
                height: 100,
                className: "border border-gray-300 rounded-md bg-white shadow-md"
              }}
              ref={sigPadRef}
            />
          </div>
          <button
            onClick={clearSignature}
            disabled={loading}
            className="mt-2 text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Clear Employee Signature
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">Witness Signature</label>
          <div className="w-full overflow-x-auto">
            <SignatureCanvas
              penColor="black"
              canvasProps={{
                width: 300,
                height: 100,
                className: "border border-gray-300 rounded-md bg-white shadow-md"
              }}
              ref={witnessSigPadRef}
            />
          </div>
          <button
            onClick={clearWitnessSignature}
            disabled={loading}
            className="mt-2 text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Clear Witness Signature
          </button>
        </div>

        <button
          onClick={generatePDF}
          disabled={loading}
          className={`w-full mt-6 py-3 rounded-md font-semibold transition ${
            loading
              ? 'bg-blue-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <FaSpinner className="animate-spin" />
              Submitting…
            </span>
          ) : (
            'Generate & Submit PDF'
          )}
        </button>
      </div>
    </div>
  );
}
