import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarChart from '../components/Charts/BarChart';
import PieChart from '../components/Charts/PieChart';
import ExcelExporter from '../components/ExcelExporter';

export default function ManagerDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('fibucaUser'));
    if (!storedUser || storedUser.role !== 'manager') {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Manager Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarChart />
        <PieChart />
      </div>
      <ExcelExporter />
    </div>
  );
}
