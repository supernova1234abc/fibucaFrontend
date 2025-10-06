// src/components/IDCard.jsx
import React, { forwardRef, useMemo } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";

const baseURL = import.meta.env.VITE_BACKEND_URL;

const IDCard = forwardRef(({ card }, ref) => {
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

  // New helpers to resolve a usable image URL from multiple possible fields
  const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
  const isLikelyUuid = (s) =>
    typeof s === "string" && /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/.test(s) || /^[0-9a-fA-F]{24,}$/.test(s);

  const getPhotoSrc = (c) => {
    if (!c) return null;

    // 1. Prefer explicit cleaned/processed URL fields (different possible keys)
    const cleanedCandidates = [
      c.cleanPhotoUrl,
      c.cleanedPhotoUrl,
      c.photo?.cleanUrl,
      c.photo?.clean_url,
      c.photo?.cdnUrl,
      c.photo?.cdn_url,
      c.photo?.url, // sometimes nested
    ];
    for (const candidate of cleanedCandidates) {
      if (candidate && isUrl(candidate)) return candidate;
      if (candidate && typeof candidate === "string" && !candidate.startsWith("/")) return candidate;
      if (candidate && typeof candidate === "string") {
        // treat as backend-relative path
        return `${baseURL.replace(/\/$/, "")}/${String(candidate).replace(/^\/+/, "")}`;
      }
    }

    // 2. Raw/original url fields
    const rawCandidates = [
      c.rawPhotoUrl,
      c.raw_photo_url,
      c.photoUrl,
      c.photo_url,
      c.photo?.originalUrl,
      c.photo?.original_url,
    ];
    for (const candidate of rawCandidates) {
      if (!candidate) continue;
      if (isUrl(candidate)) return candidate;
      // if looks like an Uploadcare uuid, build Uploadcare CDN URL
      if (isLikelyUuid(candidate)) return `https://ucarecdn.com/${candidate}/`;
      // treat as backend relative path
      return `${baseURL.replace(/\/$/, "")}/${String(candidate).replace(/^\/+/, "")}`;
    }

    // 3. If object returned by backend with uploadcare file info
    if (c.photo && typeof c.photo === "object") {
      if (c.photo.file && isLikelyUuid(c.photo.file)) return `https://ucarecdn.com/${c.photo.file}/`;
      if (c.photo.uuid && isLikelyUuid(c.photo.uuid)) return `https://ucarecdn.com/${c.photo.uuid}/`;
      if (c.photo.cdn_url) return c.photo.cdn_url;
    }

    // nothing usable
    return null;
  };

  // Compute once per card for rendering
  const photoSrc = useMemo(() => getPhotoSrc(card), [card]);

  const cardStyle =
    "relative w-80 h-48 bg-gradient-to-br from-blue-100 via-white to-blue-50 " +
    "rounded-lg shadow-md border overflow-hidden print:bg-gradient-to-br " +
    "px-3 pt-8 pb-1 text-[10px] leading-tight";

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="px-3 py-1 bg-blue-600 text-white text-xs rounded shadow hover:bg-blue-700 print:hidden"
      >
        Print ID
      </button>

      <div
        ref={ref}
        className="flex flex-col md:flex-row gap-4"
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* FRONT SIDE */}
        <div className={cardStyle} style={{ fontFamily: "Inter, sans-serif" }}>
          {/* Banner */}
          <div className="absolute top-0 left-0 right-0 h-7 bg-blue-800 rounded-t-lg flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              IDENTIFICATION
            </span>
          </div>

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <img
              src="/images/newFibucaLogo.png"
              alt="Watermark Logo"
              className="w-1/2 object-contain"
            />
          </div>

          {/* Photo + Name + Role */}
          <div className="absolute top-12 ml-3 flex flex-col items-center w-1/3 space-y-0 pt-1">
            <div className="w-24 h-24 mr-16 rounded-full overflow-hidden flex items-center justify-center">
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt="ID Photo"
                  className="object-cover w-full h-full rounded-md shadow"
                  onError={(e) => {
                    // fallback when the resolved URL fails to load
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/fallback-avatar.png";
                  }}
                />
              ) : ( (card?.photoStatus || card?.photo_status) && /process|clean/i.test(String(card?.photoStatus || card?.photo_status || "")) ? (
                <div className="flex items-center justify-center text-[10px] text-gray-500">
                  Processing...
                </div>
              ) : (
                <span className="text-gray-400 text-xs">No Photo</span>
              ))}
            </div>
            <p className="text-xs font-mono ml-2 text-black text-center truncate max-w-[19rem]">
              {getFirstAndLastName(card?.fullName)}
            </p>
            <p className="text-xs text-gray-700 text-center truncate max-w-[10rem]">
              {card?.role || "Position"}
            </p>
          </div>

          {/* QR Code */}
          <div className="absolute top-20 ml-24 left-36 pr-1 flex items-center justify-center">
            <QRCode
              value={`${card?.userId || "user"}-${card?.cardNumber || "0000"}`}
              size={64}
              bgColor="transparent"
              fgColor="#000"
            />
          </div>

          {/* ID# + Date */}
          <div className="absolute bottom-2 right-3 flex flex-col items-center space-y-0">
            <p className="text-xs font-mono">ID: {card?.cardNumber || "N/A"}</p>
            <p className="text-xs">Issued: {formattedDate}</p>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className={cardStyle} style={{ fontFamily: "Inter, sans-serif" }}>
          <p className="font-semibold text-center mb-1">
            This Staff Identity is the Property of
          </p>
          <p className="text-center font-bold text-[9px] uppercase mb-2">
            THE FINANCIAL, INDUSTRIAL, BANKING, UTILITIES, COMMERCIAL & AGRO-PROCESSING
            INDUSTRIES TRADE UNION
          </p>
          <p className="text-center mb-0.5">
            5th Floor Mahiwa/Lumumba, P.O.Box 14317, Dar es Salaam.
          </p>
          <p className="text-center mb-0.5">Tel: +255732999782, Fax: +255732999783</p>
          <p className="text-center mb-0.5">E-mail: fibucatradeunion@gmail.com</p>
          <p className="text-center mb-4">
            If lost and found return to the above address
          </p>

          {/* Signature */}
          <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center">
            <hr className="w-1/2 border-t border-dotted border-gray-500 mb-1" />
            <p className="italic text-gray-500 text-[10px] text-center">
              General Secretary Signature
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default IDCard;
