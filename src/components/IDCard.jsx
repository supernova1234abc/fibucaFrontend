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

// Cloudinary: background removal -> transparent PNG
function toCloudinaryTransparentUrl(rawUrl, { height = 260 } = {}) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  if (!rawUrl.includes("/upload/")) return rawUrl;

  const [prefix, rest] = rawUrl.split("/upload/");
  const tr = `e_background_removal/c_scale,h_${height}/f_png/q_auto:best,dpr_2.0/`;
  return `${prefix}/upload/${tr}${rest}`;
}

const CARD_W = 340;
const CARD_H = 214;

const IDCard = forwardRef(({ card }, ref) => {
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
          return toCloudinaryTransparentUrl(candidate, { height: 260 });
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

      pdf.save(`ID_${card?.cardNumber || "card"}.pdf`);

      await Swal.fire({
        icon: "success",
        title: "PDF Generated!",
        text: "ID card PDF downloaded successfully.",
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
    "relative overflow-hidden rounded-[18px] border border-blue-200 bg-white text-[10px] leading-tight shadow-[0_10px_30px_rgba(0,0,0,0.16)]";

  return (
    <>
      <div className="flex flex-col items-center space-y-4 p-4">
        <button
          onClick={handlePrint}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-md"
        >
          Print ID
        </button>

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
            <div className="absolute top-[48px] left-[12px] z-30">
              <div
                className="relative w-[110px] h-[110px] rounded-full overflow-hidden"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #f8fafc 0%, #dbeafe 100%)",
                  border: "4px solid rgba(255,255,255,0.95)",
                  boxShadow:
                    "0 6px 18px rgba(30,64,175,0.22), inset 0 0 0 1px rgba(30,64,175,0.14)",
                }}
              >
                {photoSrc ? (
                  <>
                    <img
                      src={photoSrc}
                      alt="ID"
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      style={{
                        imageRendering: "high-quality",
                        filter: "saturate(1.1) contrast(1.08)",
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden",
                      }}
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
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs bg-transparent">
                    No Photo
                  </div>
                )}
              </div>

              <div className="mt-2 pl-1 w-[150px]">
                <p className="m-0 text-[12px] font-bold text-slate-900 leading-none tracking-[0.3px]">
                  {getFirstAndLastName(card?.fullName)}
                </p>
                <p className="m-0 mt-[4px] text-[11px] font-medium text-blue-900 leading-none">
                  {(card?.role || "MEMBER").toUpperCase()}
                </p>
              </div>
            </div>

            {/* organization label */}
            <div className="absolute top-[54px] right-[14px] z-30 text-right">
              <p className="m-0 text-[9px] font-semibold text-blue-900 tracking-[0.6px]">
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
                value={`${card?.userId || "user"}-${card?.cardNumber || "0000"}`}
                size={72}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                includeMargin={false}
              />
            </div>

            {/* bottom info */}
            <div
              className="absolute bottom-[12px] right-[12px] left-[150px] z-30 px-1 py-1"
              style={{
                background: "transparent",
                border: "none",
                boxShadow: "none",
                backdropFilter: "none",
              }}
            >
              <p
                className="m-0 text-[10px] font-bold text-slate-900 leading-tight"
                style={{ textShadow: "0 1px 2px rgba(255,255,255,0.85)" }}
              >
                ID: <span className="text-blue-950">{card?.cardNumber || "N/A"}</span>
              </p>
              <p
                className="m-0 mt-[3px] text-[9px] text-slate-800 leading-tight"
                style={{ textShadow: "0 1px 2px rgba(255,255,255,0.85)" }}
              >
                Issued: {formattedDate}
              </p>
              <p
                className="m-0 mt-[3px] text-[9px] text-slate-800 leading-tight break-words font-medium"
                style={{ textShadow: "0 1px 2px rgba(255,255,255,0.85)" }}
              >
                {String(card?.company || "FIBUCA").toUpperCase()}
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
                THIS STAFF IDENTITY IS THE PROPERTY OF
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default IDCard;