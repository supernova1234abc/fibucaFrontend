// src/components/IDCard.jsx
import React, { forwardRef, useMemo, useState, useEffect } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";

const baseURL = import.meta.env.VITE_BACKEND_URL;

const IDCard = forwardRef(({ card }, ref) => {
  const [photoLoaded, setPhotoLoaded] = useState(false);

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
    const last =
      parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
    return last ? `${first} ${last}` : first;
  };

  const isUrl = (s) =>
    typeof s === "string" && /^https?:\/\//i.test(s);

  const isLikelyUuid = (s) =>
    typeof s === "string" &&
    (/^[0-9a-fA-F-]{36}$/.test(s) ||
      /^[0-9a-fA-F]{24,}$/.test(s));

  const getPhotoSrc = (c) => {
    if (!c) return null;

    const cleanedCandidates = [
      c.cleanPhotoUrl,
      c.cleanedPhotoUrl,
      c.photo?.cleanUrl,
      c.photo?.cdnUrl,
      c.photo?.url,
    ];

    for (const candidate of cleanedCandidates) {
      if (!candidate) continue;
      if (isUrl(candidate)) return candidate;
      return `${baseURL?.replace(/\/$/, "")}/${String(
        candidate
      ).replace(/^\/+/, "")}`;
    }

    const rawCandidates = [
      c.rawPhotoUrl,
      c.photoUrl,
      c.photo?.originalUrl,
    ];

    for (const candidate of rawCandidates) {
      if (!candidate) continue;
      if (isUrl(candidate)) return candidate;
      if (isLikelyUuid(candidate))
        return `https://ucarecdn.com/${candidate}/`;
      return `${baseURL?.replace(/\/$/, "")}/${String(
        candidate
      ).replace(/^\/+/, "")}`;
    }

    return null;
  };

  const photoSrc = useMemo(() => getPhotoSrc(card), [card]);

  useEffect(() => {
    setPhotoLoaded(false);
  }, [photoSrc]);

  const handlePrint = () => {
    window.print();
  };

  const cardStyle =
    "relative w-80 h-48 bg-gradient-to-br from-blue-100 via-white to-blue-50 " +
    "rounded-lg shadow-md border px-3 pt-8 pb-1 text-[10px] leading-tight " +
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

        <div
          ref={ref}
          className="flex flex-col md:flex-row gap-4 print:gap-0"
        >
          {/* FRONT */}
          <div className={cardStyle}>
            <div className="absolute top-0 left-0 right-0 h-7 bg-blue-800 rounded-t-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                IDENTIFICATION
              </span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <img
                src="/images/newFibucaLogo.png"
                alt="Watermark"
                className="w-1/2 object-contain"
              />
            </div>

            <div className="absolute top-12 left-3 flex flex-col items-center w-1/3">
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt="ID"
                    className="object-cover w-full h-full"
                    onLoad={() => setPhotoLoaded(true)}
                    onError={(e) => {
                      e.currentTarget.src =
                        "/fallback-avatar.png";
                      setPhotoLoaded(true);
                    }}
                  />
                ) : (
                  <span className="text-gray-400 text-xs">
                    No Photo
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-center mt-1">
                {getFirstAndLastName(card?.fullName)}
              </p>

              <p className="text-xs text-gray-700 text-center">
                {card?.role || "Position"}
              </p>
            </div>

            <div className="absolute top-20 right-4">
              <QRCode
                value={`${card?.userId || "user"}-${card?.cardNumber || "0000"}`}
                size={64}
              />
            </div>

            <div className="absolute bottom-2 right-3 text-xs text-center">
              <p>ID: {card?.cardNumber || "N/A"}</p>
              <p>Issued: {formattedDate}</p>
            </div>
          </div>

          {/* BACK */}
          <div className={cardStyle}>
            <p className="font-semibold text-center mb-1">
              This Staff Identity is the Property of
            </p>

            <p className="text-center font-bold text-[9px] uppercase mb-2">
              THE FINANCIAL, INDUSTRIAL, BANKING, UTILITIES,
              COMMERCIAL & AGRO-PROCESSING INDUSTRIES TRADE UNION
            </p>

            <p className="text-center text-xs">
              5th Floor Mahiwa/Lumumba, P.O.Box 14317, Dar es Salaam.
            </p>

            <p className="text-center text-xs">
              Tel: +255732999782
            </p>

            <p className="text-center text-xs">
              fibucatradeunion@gmail.com
            </p>

            <div className="absolute bottom-3 left-0 right-0 text-center">
              <hr className="w-1/2 mx-auto border-dotted border-gray-500 mb-1" />
              <p className="italic text-gray-500 text-xs">
                General Secretary Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default IDCard;