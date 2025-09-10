import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

export default function PDFGenerator() {
  const generateReport = async () => {
    try {
      const response = await axios.get('https://5307b834865a.ngrok-free.app/submissions');
      const data = response.data;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('FIBUCA Submissions Report', 14, 20);

      const tableData = data.map((row, index) => [
        index + 1,
        row.employeeName,
        row.employeeNumber,
        row.employerName,
        row.dues,
        row.witness,
        new Date(row.submittedAt).toLocaleDateString()
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['#', 'Employee', 'Number', 'Employer', 'Dues', 'Witness', 'Date']],
        body: tableData,
      });

      doc.save('fibuca_report.pdf');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Error generating PDF');
    }
  };

  return (
    <button
      onClick={generateReport}
      className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-md"
    >
      Download PDF Report
    </button>
  );
}
