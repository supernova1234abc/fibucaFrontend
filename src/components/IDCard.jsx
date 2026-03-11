// src/components/IDCard.jsx
import React, { forwardRef, useMemo, useState, useEffect, useRef } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Swal from "sweetalert2";

const baseURL = import.meta.env.VITE_BACKEND_URL;

// Cloudinary: background removal -> transparent PNG
function toCloudinaryTransparentUrl(rawUrl, { height = 140 } = {}) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  if (!rawUrl.includes("/upload/")) return rawUrl;

  const [prefix, rest] = rawUrl.split("/upload/");
  const tr = `e_background_removal/c_scale,h_${height}/f_png,q_auto:best/`;
  return `${prefix}/upload/${tr}${rest}`;
}

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
        if (candidate.includes("res.cloudinary.com") && candidate.includes("/upload/")) {
          return toCloudinaryTransparentUrl(candidate, { height: 140 });
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

  const waitForImages = async (root) => {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  const renderCardSide = async (element) => {
    const rect = element.getBoundingClientRect();

    const canvas = await html2canvas(element, {
      scale: 4,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      imageTimeout: 30000,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.body.querySelector("[data-idcard-side='true']");
        if (clonedEl) {
          clonedEl.style.transform = "none";
        }
      },
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
        pdf.addImage(imgData, "PNG", 0, 0, w, h, undefined, "FAST");
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
        timer: 1800,
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

  const cardStyle =
    "relative w-[340px] h-[214px] overflow-hidden " +
    "rounded-[18px] shadow-[0_10px_30px_rgba(0,0,0,0.16)] border border-blue-200 " +
    "text-[10px] leading-tight " +
    "print:shadow-none print:rounded-none print:border-gray-300 bg-white";

  return (
    <>
      <style>{`
        @media print {
          body { margin:0; padding:0; }
          button { display:none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="flex flex-col items-center space-y-4 p-4">
        <button
          onClick={handlePrint}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-md print:hidden shadow"
        >
          Print ID
        </button>

        <div ref={ref} className="flex flex-col md:flex-row gap-5 print:gap-0">
          {/* FRONT */}
          <div
            ref={frontRef}
            data-idcard-side="true"
            className={cardStyle}
            style={{
              background:
                "linear-gradient(135deg, #eff6ff 0%, #dbeafe 18%, #ffffff 45%, #e0f2fe 72%, #bfdbfe 100%)",
            }}
          >
            {/* decorative glow 1 */}
            <div
              className="absolute -top-10 -left-10 w-36 h-36 rounded-full blur-2xl opacity-50"
              style={{ background: "radial-gradient(circle, rgba(37,99,235,0.35), transparent 70%)" }}
            />

            {/* decorative glow 2 */}
            <div
              className="absolute bottom-0 right-0 w-40 h-40 rounded-full blur-2xl opacity-50"
              style={{ background: "radial-gradient(circle, rgba(14,165,233,0.28), transparent 70%)" }}
            />

            {/* subtle diagonal pattern */}
            <div
              className="absolute inset-0 opacity-[0.10] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(30,64,175,0.22) 0px, rgba(30,64,175,0.22) 2px, transparent 2px, transparent 14px)",
              }}
            />

            {/* watermark/logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.16] pointer-events-none z-10">
              <img
                src="/images/logo-watermark.png"
                alt="Watermark"
                crossOrigin="anonymous"
                className="w-[175px] object-contain saturate-150 contrast-125"
              />
            </div>

            {/* top header band */}
            <div
              className="absolute top-0 left-0 right-0 h-9 z-30"
              style={{
                background: "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 48%, #2563eb 100%)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-white font-bold tracking-[1px] leading-none drop-shadow-sm"
                  style={{ fontSize: "15px" }}
                >
                  IDENTIFICATION
                </span>
              </div>
            </div>

            {/* small accent bar */}
            <div
              className="absolute top-9 left-0 right-0 h-[4px] z-30"
              style={{
                background: "linear-gradient(90deg, #93c5fd 0%, #e0f2fe 50%, #60a5fa 100%)",
              }}
            />

            {/* photo block */}
            <div className="absolute top-[48px] left-[10px] z-30">
              <div
                className="relative w-[110px] h-[110px] rounded-full overflow-hidden"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #f8fafc 0%, #dbeafe 100%)",
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
                        imageRendering: "auto",
                        filter: "saturate(1.08) contrast(1.06)",
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

              {/* name + role */}
              <div className="mt-2 pl-1 w-[140px]">
                <p className="m-0 text-[12px] font-bold text-slate-900 leading-none tracking-[0.4px]">
                  {getFirstAndLastName(card?.fullName)}
                </p>
                <p className="m-0 mt-[4px] text-[11px] font-medium text-blue-900 leading-none">
                  {(card?.role || "MEMBER").toUpperCase()}
                </p>
              </div>
            </div>

            {/* organization mini label */}
            <div className="absolute top-[54px] right-[12px] z-30 text-right">
              <p className="m-0 text-[9px] font-semibold text-blue-900 tracking-[0.6px]">
                FIBUCA
              </p>
              <p className="m-0 text-[8px] text-slate-600">
                TRADE UNION CARD
              </p>
            </div>

            {/* QR */}
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

            {/* bottom info panel */}
            <div
              className="absolute bottom-[10px] right-[12px] left-[150px] z-30 rounded-[12px] px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.78)",
                backdropFilter: "blur(3px)",
                border: "1px solid rgba(148,163,184,0.28)",
                boxShadow: "0 4px 12px rgba(30,41,59,0.08)",
              }}
            >
              <p className="m-0 text-[10px] font-semibold text-slate-800">
                ID: <span className="text-blue-900">{card?.cardNumber || "N/A"}</span>
              </p>
              <p className="m-0 mt-[2px] text-[9px] text-slate-700">
                Issued: {formattedDate}
              </p>
              <p className="m-0 mt-[2px] text-[9px] text-slate-700 truncate">
                {String(card?.company || "FIBUCA").toUpperCase()}
              </p>
            </div>
          </div>

          {/* BACK */}
          <div
            ref={backRef}
            data-idcard-side="true"
            className={cardStyle}
            style={{
              background:
                "linear-gradient(160deg, #eff6ff 0%, #ffffff 28%, #dbeafe 58%, #e0f2fe 100%)",
            }}
          >
            {/* back pattern */}
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 16px 16px, rgba(30,64,175,0.35) 2px, transparent 2.5px)",
                backgroundSize: "22px 22px",
              }}
            />

            {/* header */}
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

            {/* watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] z-10 pointer-events-none">
              <img
                src="/images/logo-watermark.png"
                alt="Watermark"
                crossOrigin="anonymous"
                className="w-[160px] object-contain saturate-150 contrast-125"
              />
            </div>

            {/* content */}
            <div className="absolute top-[48px] left-[14px] right-[14px] z-30 text-center">
              <p className="font-semibold text-[10px] text-slate-800 mb-2 leading-snug">
                THIS STAFF IDENTITY IS THE PROPERTY OF
              </p>

              <p className="font-bold text-[9px] uppercase mb-3 leading-snug text-blue-950">
                THE FINANCIAL, INDUSTRIAL, BANKING, UTILITIES, COMMERCIAL & AGRO-PROCESSING INDUSTRIES TRADE UNION
              </p>

              <div
                className="rounded-[12px] px-3 py-3"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(148,163,184,0.28)",
                  boxShadow: "0 4px 14px rgba(30,41,59,0.08)",
                }}
              >
                <p className="text-[10px] text-slate-800 m-0">
                  5th Floor Mahiwa/Lumumba, P.O.Box 14317, Dar es Salaam
                </p>
                <p className="text-[10px] text-slate-800 m-0 mt-[4px]">
                  Tel: +255732999782
                </p>
                <p className="text-[10px] text-slate-800 m-0 mt-[4px]">
                  fibucatradeunion@gmail.com
                </p>
              </div>
            </div>

            {/* bottom signature area */}
            <div className="absolute bottom-[12px] left-0 right-0 text-center z-30">
              <div
                className="w-[150px] mx-auto border-b border-dashed border-slate-500 mb-1"
              />
              <p className="italic text-slate-600 text-[10px]">
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