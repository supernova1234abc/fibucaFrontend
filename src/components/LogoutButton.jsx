// src/components/LogoutButton.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../context/AuthContext';
import { api }         from '../lib/api';        // ← your axios instance
import Swal            from 'sweetalert2';
import { FiLogOut }    from 'react-icons/fi';

export default function LogoutButton() {
  const { setUser } = useAuth();
  const navigate    = useNavigate();

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text:  'You will be logged out!',
      icon:  'warning',
      showCancelButton:  true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor:  '#d33',
      confirmButtonText:  'Yes, logout'
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        // 1) Hit your logout endpoint to clear the HTTP-only cookie
        await api.post('/api/logout');
      } catch (err) {
        console.warn('Logout request failed, clearing client state anyway', err);
      }

      // 2) Clear React context user
      setUser(null);

      // 3) Redirect back to login
      navigate('/login', { replace: true });

      // 4) Notify
      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text:  'You have been successfully logged out.',
        timer: 1500,
        showConfirmButton: false
      });
    });
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-semibold shadow transition"
    >
      <FiLogOut />
      Logout
    </button>
  );
}
