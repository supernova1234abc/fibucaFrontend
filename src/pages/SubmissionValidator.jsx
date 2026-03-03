// src/pages/SubmissionValidator.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../lib/api";

export default function SubmissionValidator() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // Always reset old access flags first
      localStorage.removeItem("CLIENT_FORM_ACCESS");
      localStorage.removeItem("STAFF_LINK_TOKEN");

      if (!token || typeof token !== "string" || token.trim().length === 0) {
        await Swal.fire({
          title: "Invalid Link",
          text: "No token found in the URL.",
          icon: "error",
          confirmButtonText: "Go Home",
        });
        return navigate("/");
      }

      try {
        console.log("🔍 SubmissionValidator: validating:", token);

        const res = await api.get(`/api/staff/validate/${token}`);

        if (res?.data?.valid === true) {
          // ✅ Token valid
          localStorage.setItem("CLIENT_FORM_ACCESS", "true");
          localStorage.setItem("STAFF_LINK_TOKEN", token);

          await Swal.fire({
            title: "Access Granted",
            text: "You can now submit your form.",
            icon: "success",
            timer: 1200,
            showConfirmButton: false,
          });

          // IMPORTANT: redirect to the real form route in your app
          // (you already use /client-form/:token)
          return navigate(`/client-form/${token}`, { replace: true });
        }

        // If backend returns { valid:false } or something unexpected
        await Swal.fire({
          title: "Access Denied",
          text: "Invalid or expired link.",
          icon: "error",
          confirmButtonText: "Go Home",
        });
        return navigate("/", { replace: true });
      } catch (err) {
        console.error("❌ SubmissionValidator: validation failed", err);

        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.details ||
          err?.message ||
          "Invalid or expired link.";

        await Swal.fire({
          title: "Access Denied",
          text: msg,
          icon: "error",
          confirmButtonText: "Go Home",
        });

        return navigate("/", { replace: true });
      }
    };

    run();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-700 dark:text-gray-200 font-semibold">
          Validating your access...
        </p>
      </div>
    </div>
  );
}