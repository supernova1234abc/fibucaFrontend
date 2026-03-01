// src/pages/SubmissionValidator.jsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../lib/api';

export default function SubmissionValidator() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const validateAndRedirect = async () => {
      try {
        console.log("🔍 Validating token:", token);
        
        // Validate the token with backend
        const res = await api.get(`/api/staff/validate/${token}`);

        if (res.data.valid) {
          console.log("✅ Token valid, setting flags and redirecting...");
          
          // ✅ Token is valid, set access flag and redirect
          localStorage.setItem('CLIENT_FORM_ACCESS', 'true');
          localStorage.setItem('STAFF_LINK_TOKEN', token); // Store token for reference
          
          // Verify flags were set
          console.log("🔐 Flags set:", {
            ACCESS: localStorage.getItem('CLIENT_FORM_ACCESS'),
            TOKEN: !!localStorage.getItem('STAFF_LINK_TOKEN')
          });
          
          Swal.fire({
            title: 'Access Granted',
            text: 'You can now submit your form.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            console.log("➡️ Redirecting to /client-form");
            navigate('/client-form');
          });
        }
      } catch (err) {
        console.error('❌ Token validation failed:', err);
        
        const errorMsg = err.response?.data?.error || 'Invalid or expired link.';
        
        Swal.fire({
          title: 'Access Denied',
          text: errorMsg,
          icon: 'error',
          confirmButtonText: 'Go Home',
        }).then(() => {
          navigate('/');
        });
      }
    };

    if (token) {
      validateAndRedirect();
    } else {
      console.error("❌ No token in URL");
      navigate('/');
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-semibold">Validating your access...</p>
      </div>
    </div>
  );
}
