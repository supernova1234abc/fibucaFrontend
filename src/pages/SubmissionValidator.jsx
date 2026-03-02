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
        console.log("🔍 SubmissionValidator: Validating token:", token);
        
        // Validate the token with backend
        const res = await api.get(`/api/staff/validate/${token}`);

        if (res.data.valid) {
          console.log("✅ SubmissionValidator: Token valid, setting flags and redirecting...");
          
          // ✅ Token is valid, set access flag and redirect
          localStorage.setItem('CLIENT_FORM_ACCESS', 'true');
          localStorage.setItem('STAFF_LINK_TOKEN', token);
          
          console.log("🔐 SubmissionValidator: Flags set successfully");
          
          Swal.fire({
            title: 'Access Granted',
            text: 'You can now submit your form.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            console.log("➡️ SubmissionValidator: Redirecting to /client-form/" + token);
            navigate(`/client-form/${token}`);
          });
        }
      } catch (err) {
        console.error('❌ SubmissionValidator: Token validation failed');
        console.error('Error details:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
          url: err.response?.config?.url
        });
        
        const errorMsg = err.response?.data?.error || err.response?.data?.details || 'Invalid or expired link.';
        
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
      console.error("❌ SubmissionValidator: No token in URL");
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
