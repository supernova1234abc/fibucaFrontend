// src/components/IDCard.jsx
import React, { forwardRef, useMemo, useState, useEffect, useRef } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Swal from "sweetalert2";

const baseURL = import.meta.env.VITE_BACKEND_URL;

// Cloudinary: background removal -> transparent PNG (NO shadow)
function toCloudinaryTransparentUrl(rawUrl, { height = 110 } = {}) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  if (!rawUrl.includes("/upload/")) return rawUrl;

  const [prefix, rest] = rawUrl.split("/upload/");
  const tr = `e_background_removal/c_scale,h_${height}/f_png,q_auto/`;
  return `${prefix}/upload/${tr}${rest}`;
}

const IDCard = forwardRef(({ card }, ref) => {
  const [photoLoaded, setPhotoLoaded] = useState(false);

  // refs for front and back, used only for PDF capture
  const frontRef = useRef(null);
  const backRef = useRef(null);

  const formattedDate = card?.issuedAt
    ? new Date(card.issuedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const getFirstAndLastName = (fullName) => {
    if (!fullName) return "Name";
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0].toUpperCase();
    const last = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
    return last ? `${first} ${last}` : first;
  };

  const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
  const isLikelyUuid = (s) =>
    typeof s === "string" &&
    (/^[0-9a-fA-F-]{36}$/.test(s) || /^[0-9a-fA-F]{24,}$/.test(s));

  const getPhotoSrc = (c) => {
    if (!c) return null;

    // Prefer RAW cloudinary URL so we can deliver transparent bg on-the-fly
    const candidates = [
      c.rawPhotoUrl,
      c.photoUrl,
      c.photo?.originalUrl,

      c.cleanPhotoUrl,
      c.cleanedPhotoUrl,
      c.photo?.cleanUrl,
      c.photo?.cdnUrl,
      c.photo?.url,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;

      if (isUrl(candidate)) {
        if (candidate.includes("res.cloudinary.com") && candidate.includes("/upload/")) {
          return toCloudinaryTransparentUrl(candidate, { height: 110 });
        }
        return candidate;
      }

      if (isLikelyUuid(candidate)) return `https://ucarecdn.com/${candidate}/`;

      return `${baseURL?.replace(/\/$/, "")}/${String(candidate).replace(/^\/+/, "")}`;
    }

    return null;
  };

  const photoSrc = useMemo(() => getPhotoSrc(card), [card]);

  useEffect(() => {
    setPhotoLoaded(false);
  }, [photoSrc]);

  // ---------------- PDF PRINT (optimized) ----------------
  const handlePrint = async () => {
    if (!frontRef.current || !backRef.current) {
      await Swal.fire({
        icon: "warning",
        title: "Not Ready",
        text: "Card elements not ready for printing.",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 54],
      });

      const renderSide = async (element) => {
        const rect = element.getBoundingClientRect();
        const scale = 1.5;

        const canvas = await html2canvas(element, {
          scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.clientWidth,
          windowHeight: document.documentElement.clientHeight,
        });

        return canvas.toDataURL("image/png", 0.85);
      };

      const addFullPageImage = (imgData) => {
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "PNG", 0, 0, w, h, undefined, "FAST");
      };

      const frontImg = await renderSide(frontRef.current);
      addFullPageImage(frontImg);

      const backImg = await renderSide(backRef.current);
      pdf.addPage([85.6, 54], "landscape");
      addFullPageImage(backImg);

      pdf.save(`ID_${card?.cardNumber || "card"}.pdf`);

      await Swal.fire({
        icon: "success",
        title: "PDF Generated!",
        text: "ID card PDF downloaded successfully.",
        confirmButtonColor: "#1e40af",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      await Swal.fire({
        icon: "error",
        title: "PDF Generation Failed",
        text: "Unable to generate the PDF. Please try again.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const cardStyle =
    "relative w-80 h-48 overflow-hidden " +
    "bg-gradient-to-br from-blue-100 via-white to-blue-50 " +
    "rounded-lg shadow-md border border-gray-300 " +
    "px-3 pt-8 pb-1 text-[10px] leading-tight " +
    "print:shadow-none print:rounded-none print:border-gray-400";

  return (
    <>
      <style>{`
        @media print {
          body { margin:0; padding:0; }
          button { display:none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="flex flex-col items-center space-y-4 p-4">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md print:hidden"
        >
          Print ID
        </button>

        <div ref={ref} className="flex flex-col md:flex-row gap-4 print:gap-0">
          {/* FRONT */}
          <div ref={frontRef} className={cardStyle}>
            {/* PHOTO LAYER (sent backward) */}
            <div className="absolute top-10 left-2 w-[104px] z-10">
              <div className="relative w-[104px] h-[118px] overflow-hidden rounded-md bg-transparent">
                {photoSrc ? (
                  <>
                    <img
                      src={photoSrc}
                      alt="ID"
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      onLoad={() => setPhotoLoaded(true)}
                      onError={(e) => {
                        e.currentTarget.src = "/fallback-avatar.png";
                        setPhotoLoaded(true);
                      }}
                    />
                    {!photoLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-blue-50" />
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs bg-transparent">
                    No Photo
                  </div>
                )}
              </div>

              {/* NAME + ROLE (moved back to bottom of photo) */}
              <div className="absolute top-26 left-0 right-0 text-xs text-center z-30">
                <p className="text-[11px] font-mono text-left leading-snug">
                  {getFirstAndLastName(card?.fullName)}
                </p>
                <p className="text-[11px] text-gray-700 text-left leading-snug">
                  {card?.role || "Position"}
                </p>
              </div>
            </div>

            {/* watermark/logo stays in front of photo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none z-20">
              <img
                src="/images/newFibucaLogo.png"
                alt="Watermark"
                className="w-1/2 object-contain"
              />
            </div>

            {/* header bar */}
            <div className="absolute top-0 left-0 right-0 h-7 bg-blue-800 flex items-center justify-center z-30">
              <span className="text-white font-semibold text-sm">IDENTIFICATION</span>
            </div>

            {/* QR (as before) */}
            <div className="absolute top-20 right-4 z-30">
              <QRCode
                value={`${card?.userId || "user"}-${card?.cardNumber || "0000"}`}
                size={64}
              />
            </div>

            {/* bottom info (as before) */}
            <div className="absolute bottom-2 right-3 text-xs text-center z-30">
              <p>ID: {card?.cardNumber || "N/A"}</p>
              <p>Issued: {formattedDate}</p>
            </div>
          </div>

          {/* BACK */}
          <div ref={backRef} className={cardStyle}>
            <p className="font-semibold text-center mb-1">
              This Staff Identity is the Property of
            </p>

            <p className="text-center font-bold text-[9px] uppercase mb-2">
              THE FINANCIAL, INDUSTRIAL, BANKING, UTILITIES, COMMERCIAL & AGRO-PROCESSING INDUSTRIES TRADE UNION
            </p>

            <p className="text-center text-xs">
              5th Floor Mahiwa/Lumumba, P.O.Box 14317, Dar es Salaam.
            </p>
            <p className="text-center text-xs">Tel: +255732999782</p>
            <p className="text-center text-xs">fibucatradeunion@gmail.com</p>

            <div className="absolute bottom-3 left-0 right-0 text-center">
              <hr className="w-1/2 mx-auto border-dotted border-gray-500 mb-1" />
              <p className="italic text-gray-500 text-xs">General Secretary Signature</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default IDCard;