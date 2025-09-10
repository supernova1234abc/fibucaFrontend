
// ✅ src/components/ExcelExporter.jsx
import * as XLSX from 'xlsx';

export default function ExcelExporter() {
  const handleExport = () => {
    const data = [
      { name: 'John Doe', dues: '1%', month: 'Jan' },
      { name: 'Jane Smith', dues: '1.5%', month: 'Feb' },
      { name: 'Ali Mohamed', dues: '2%', month: 'Mar' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    XLSX.writeFile(workbook, 'fibuca_clients.xlsx');
  };

  return (
    <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 mt-6">
      Export to Excel
    </button>
  );
}