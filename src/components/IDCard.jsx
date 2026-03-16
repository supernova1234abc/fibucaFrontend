// src/components/IDCard.jsx
import React, {
  forwardRef,
  useMemo,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Swal from "sweetalert2";

const baseURL = import.meta.env.VITE_BACKEND_URL;

// Strip any Cloudinary transformation segments so we use the raw stored URL.
// cleanPhotoUrl is either already browser-cleaned (plain raw URL) or a legacy URL
// that has e_background_removal embedded — either way we just serve the file as-is.
function toCloudinaryRawUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;

  const uploadIdx = url.indexOf("/upload/");
  const afterUpload = url.slice(uploadIdx + 8); // skip '/upload/'

  // If there are transformation segments (no leading 'v'), strip them
  const versionMatch = afterUpload.match(/(v\d+\/.+)/);
  if (versionMatch) {
    return url.slice(0, uploadIdx + 8) + versionMatch[1];
  }

  return url;
}

const CARD_W = 340;
const CARD_H = 214;
const TEMPLATE_VERSION = "FIBUCA-CR80-V1";

const SLOT_LIMITS = {
  fullName: 22,
  role: 22,
  cardNumber: 18,
};

const SLOT_CLASS = {
  fullName: {
    base: "m-0 font-bold text-slate-900 leading-none tracking-[0.3px]",
    small: "text-[12px]",
    tiny: "text-[11px]",
  },
  role: {
    base: "m-0 mt-[4px] font-medium text-blue-900 leading-none",
    small: "text-[11px]",
    tiny: "text-[10px]",
  },
};

function sanitizeText(value, fallback = "N/A") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function truncateSlot(value, maxChars) {
  const clean = sanitizeText(value, "");
  if (!clean) return "";
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 3))}...`;
}

function getSlotClass(slotName, textValue) {
  const limit = SLOT_LIMITS[slotName] || 20;
  const slot = SLOT_CLASS[slotName];
  if (!slot) return "";
  const len = (textValue || "").length;
  const sizeClass = len > limit - 3 ? slot.tiny : slot.small;
  return `${slot.base} ${sizeClass}`;
}

function toSafeFileToken(value, fallback = "card") {
  const cleaned = String(value || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

const IDCard = forwardRef(({ card, previewOnly = false }, ref) => {
  const [photoLoaded, setPhotoLoaded] = useState(false);

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
    if (!fullName) return "NAME";
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0].toUpperCase();
    const last = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
    return last ? `${first} ${last}` : first;
  };

  const cardView = useMemo(() => {
    const fullName = truncateSlot(
      getFirstAndLastName(card?.fullName || card?.user?.name),
      SLOT_LIMITS.fullName
    );
    const role = truncateSlot(
      sanitizeText(card?.role || "MEMBER", "MEMBER").toUpperCase(),
      SLOT_LIMITS.role
    );
    const cardNumber = truncateSlot(
      sanitizeText(card?.cardNumber, "N/A"),
      SLOT_LIMITS.cardNumber
    );

    const qrPayload = [card?.userId || card?.user?.id || "user", cardNumber, TEMPLATE_VERSION]
      .filter(Boolean)
      .join("-");

    const isMember = role.toLowerCase() === "member";
    const identityWord = isMember ? "MEMBER" : "STAFF";

    return {
      fullName,
      role,
      cardNumber,
      qrPayload,
      identityWord,
    };
  }, [card]);

  const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);

  const isLikelyUuid = (s) =>
    typeof s === "string" &&
    (/^[0-9a-fA-F-]{36}$/.test(s) || /^[0-9a-fA-F]{24,}$/.test(s));

  const getPhotoSrc = (c) => {
    if (!c) return null;

    const candidates = [
      c.cleanPhotoUrl,
      c.cleanedPhotoUrl,
      c.photo?.cleanUrl,
      c.rawPhotoUrl,
      c.photoUrl,
      c.photo?.originalUrl,
      c.photo?.cdnUrl,
      c.photo?.url,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;

      if (isUrl(candidate)) {
        if (
          candidate.includes("res.cloudinary.com") &&
          candidate.includes("/upload/")
        ) {
          return toCloudinaryRawUrl(candidate);
        }
        return candidate;
      }

      if (isLikelyUuid(candidate)) return `https://ucarecdn.com/${candidate}/`;

      return `${baseURL?.replace(/\/$/, "")}/${String(candidate).replace(
        /^\/+/,
        ""
      )}`;
    }

    return null;
  };

  const photoSrc = useMemo(() => getPhotoSrc(card), [card]);

  useEffect(() => {
    setPhotoLoaded(false);
  }, [photoSrc]);

  const waitForImages = async (root) => {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  const renderCardSide = async (element) => {
    const canvas = await html2canvas(element, {
      scale: 5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      width: CARD_W,
      height: CARD_H,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 30000,
      logging: false,
    });

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    return canvas.toDataURL("image/png", 1.0);
  };

  const handlePrint = async () => {
    if (!frontRef.current || !backRef.current) {
      await Swal.fire({
        icon: "warning",
        title: "Not Ready",
        text: "Card elements not ready for printing.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await waitForImages(frontRef.current);
      await waitForImages(backRef.current);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 54],
        compress: false,
      });

      const addFullPageImage = (imgData) => {
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "PNG", 0, 0, w, h, undefined, "SLOW");
      };

      const frontImg = await renderCardSide(frontRef.current);
      addFullPageImage(frontImg);

      const backImg = await renderCardSide(backRef.current);
      pdf.addPage([85.6, 54], "landscape");
      addFullPageImage(backImg);

      const safeCardNumber = toSafeFileToken(cardView.cardNumber, "card");
      if (!previewOnly) {
        pdf.save(`ID_${safeCardNumber}_${TEMPLATE_VERSION}.pdf`);
      }

      await Swal.fire({
        icon: "success",
        title: previewOnly ? "ID Card Ready" : "PDF Generated!",
        text: previewOnly
          ? "This is your Digital ID Card. It is for preview only."
          : "ID card PDF downloaded. Print at 100% scale (Actual size).",
        confirmButtonColor: "#1d4ed8",
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
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

  useImperativeHandle(ref, () => ({
    printCard: handlePrint,
  }));

  const cardStyle =
    "relative z-0 isolate overflow-hidden rounded-[18px] border border-blue-200 bg-white text-[10px] leading-tight shadow-[0_10px_30px_rgba(0,0,0,0.16)]";

  return (
    <>
      <div className="flex flex-col items-center space-y-4 p-4">
        <button
          onClick={handlePrint}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-md"
        >
          {previewOnly ? "Preview Digital ID" : "Print ID"}
        </button>
        {previewOnly && (
          <p className="text-xs text-gray-500 italic text-center">
            This is a Digital ID Card for Preview Only
          </p>
        )}

        <div className="flex flex-col md:flex-row gap-5">
          {/* FRONT */}
          <div
            ref={frontRef}
            className={`${cardStyle} print-container print-bg`}
            style={{
              width: `${CARD_W}px`,
              height: `${CARD_H}px`,
              background:
                "linear-gradient(135deg, #eff6ff 0%, #dbeafe 18%, #ffffff 42%, #e0f2fe 68%, #bfdbfe 100%)",
            }}
          >
            <div
              className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-50"
              style={{
                background:
                  "radial-gradient(circle, rgba(37,99,235,0.38), transparent 70%)",
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-44 h-44 rounded-full blur-3xl opacity-50"
              style={{
                background:
                  "radial-gradient(circle, rgba(14,165,233,0.28), transparent 70%)",
              }}
            />

            <div
              className="absolute inset-0 pointer-events-none opacity-[0.12]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(30,64,175,0.18) 0px, rgba(30,64,175,0.18) 2px, transparent 2px, transparent 14px)",
              }}
            />

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.16] z-10 pointer-events-none">
              <img
                src="/images/logo-watermark.png"
                alt="Watermark"
                crossOrigin="anonymous"
                className="w-[175px] object-contain saturate-150 contrast-125"
              />
            </div>

            <div
              className="absolute top-0 left-0 right-0 h-9 z-30"
              style={{
                background:
                  "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 48%, #2563eb 100%)",
              }}
            />
            <div className="absolute top-0 left-0 right-0 h-9 z-40 flex items-center justify-center">
              <span
                className="text-white font-bold tracking-[1px] leading-none drop-shadow-sm"
                style={{ fontSize: "15px" }}
              >
                IDENTIFICATION
              </span>
            </div>

            <div
              className="absolute top-9 left-0 right-0 h-[4px] z-30"
              style={{
                background:
                  "linear-gradient(90deg, #93c5fd 0%, #e0f2fe 50%, #60a5fa 100%)",
              }}
            />

            {/* photo */}
            <div className="absolute top-[48px] left-[9px] z-30">
              <div className="relative w-[116px] h-[116px] overflow-hidden" style={{ borderBottomLeftRadius: "58px", borderBottomRightRadius: "58px" }}>
                {photoSrc ? (
                  <>
                    <img
                      src={photoSrc}
                      alt="ID"
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-contain object-center"
                      style={{
                        imageRendering: "high-quality",
                        filter: "saturate(1.1) contrast(1.08)",
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden",
                        mixBlendMode: "normal",
                      }}
                      onLoad={() => setPhotoLoaded(true)}
                      onError={(e) => {
                        e.currentTarget.src = "/fallback-avatar.png";
                        setPhotoLoaded(true);
                      }}
                    />
                    <div
                      className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[98px] h-[56px] pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 100%, rgba(15,23,42,0.56) 0%, rgba(15,23,42,0.30) 44%, rgba(15,23,42,0) 80%), radial-gradient(circle at 8% 100%, rgba(15,23,42,0.48) 0%, rgba(15,23,42,0) 36%), radial-gradient(circle at 92% 100%, rgba(15,23,42,0.48) 0%, rgba(15,23,42,0) 36%)"
                      }}
                    />
                    {!photoLoaded && <div className="absolute inset-0 bg-transparent" />}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs bg-transparent">
                    No Photo
                  </div>
                )}
              </div>

              <div className="mt-2 pl-1 w-[150px]">
                <p className={getSlotClass("fullName", cardView.fullName)}>
                  {cardView.fullName}
                </p>
                <p className={getSlotClass("role", cardView.role)}>
                  {cardView.role}
                </p>
              </div>
            </div>

            {/* organization label */}
            <div className="absolute top-[54px] right-[14px] z-30 text-right">
              <p className="m-0 text-[9px] text-center font-semibold text-blue-900 tracking-[0.6px]">
                FIBUCA
              </p>
              <p className="m-0 text-[8px] text-slate-600">TRADE UNION CARD</p>
            </div>

            {/* qr */}
            <div
              className="absolute top-[78px] right-[14px] z-30 bg-white p-[4px] rounded-[10px]"
              style={{
                boxShadow: "0 4px 14px rgba(0,0,0,0.14)",
                border: "1px solid rgba(59,130,246,0.18)",
              }}
            >
              <QRCode
                value={cardView.qrPayload}
                size={72}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                includeMargin={false}
              />
            </div>

            {/* bottom info under QR */}
            <div
              className="absolute top-[156px] right-[14px] z-30 w-[92px] text-center px-1"
              style={{
                background: "transparent",
                border: "none",
                boxShadow: "none",
                backdropFilter: "none",
              }}
            >
              <p
                className="m-0 text-[9px] font-bold text-slate-900 leading-tight"
                style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
              >
                ID: <span className="text-blue-950">{cardView.cardNumber}</span>
              </p>
              <p
                className="m-0 mt-[3px] text-[8px] text-slate-800 leading-tight"
                style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
              >
                Issued: {formattedDate}
              </p>
            </div>
          </div>

          {/* BACK */}
          <div
            ref={backRef}
            className={`${cardStyle} print-container print-bg`}
            style={{
              width: `${CARD_W}px`,
              height: `${CARD_H}px`,
              background:
                "linear-gradient(160deg, #eff6ff 0%, #ffffff 28%, #dbeafe 58%, #e0f2fe 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 16px 16px, rgba(30,64,175,0.35) 2px, transparent 2.5px)",
                backgroundSize: "22px 22px",
              }}
            />

            <div
              className="absolute top-0 left-0 right-0 h-9 z-20"
              style={{
                background: "linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)",
              }}
            />
            <div className="absolute top-[10px] left-0 right-0 z-30 text-center">
              <span className="text-white font-bold tracking-[1px] text-[14px]">
                FIBUCA
              </span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] z-10 pointer-events-none">
              <img
                src="/images/logo-watermark.png"
                alt="Watermark"
                crossOrigin="anonymous"
                className="w-[160px] object-contain saturate-150 contrast-125"
              />
            </div>

            <div className="absolute top-[48px] left-[14px] right-[14px] z-30 text-center">
              <p className="font-semibold text-[10px] text-slate-800 mb-2 leading-snug">
                THIS {cardView.identityWord} IDENTITY IS THE PROPERTY OF
              </p>

              <p className="font-bold text-[9px] uppercase mb-3 leading-snug text-blue-950">
                THE FINANCIAL, INDUSTRIAL, BANKING, UTILITIES, COMMERCIAL & AGRO-PROCESSING INDUSTRIES TRADE UNION
              </p>

              <div
                className="px-1 py-1"
                style={{
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  backdropFilter: "none",
                }}
              >
                <p
                  className="text-[10px] text-slate-900 m-0 leading-snug font-medium"
                  style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
                >
                  5th Floor Mahiwa/Lumumba, P.O.Box 14317, Dar es Salaam
                </p>
                <p
                  className="text-[10px] text-slate-900 m-0 mt-[4px] leading-snug font-medium"
                  style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
                >
                  Tel: +255732999782
                </p>
                <p
                  className="text-[10px] text-slate-900 m-0 mt-[4px] leading-snug break-all font-medium"
                  style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
                >
                  fibucatradeunion@gmail.com
                </p>
              </div>
            </div>

            <div className="absolute bottom-[14px] left-0 right-0 text-center z-30">
              <div className="w-[150px] mx-auto border-b border-dashed border-slate-500 mb-1" />
              <p className="italic text-slate-600 text-[10px] leading-none">
                General Secretary Signature
              </p>
              <p className="mt-[3px] text-[8px] text-slate-500 tracking-[0.5px]">
                TEMPLATE {TEMPLATE_VERSION}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default IDCard;