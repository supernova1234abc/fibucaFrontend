// src/pages/ClientDashboard.jsx
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChangePwModalContext } from '../components/DashboardLayout';
import { FaFilePdf, FaIdCard, FaRedo, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import IDCard from '../components/IDCard';
import { FileUploaderRegular } from '@uploadcare/react-uploader';
import '@uploadcare/react-uploader/core.css';

// ✅ Helper hook for Object URLs
function useObjectUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

export default function ClientDashboard() {
  const openChangePwModal = useContext(ChangePwModalContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [idCards, setIdCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [uploadcareUrl, setUploadcareUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);

  // Fetch Submissions
  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    setLoadingSubmission(true);
    try {
      const res = await api.get('/submissions');
      const data = Array.isArray(res.data) ? res.data : [];
      const mine = data
        .filter((s) => s.employeeNumber === user.employeeNumber)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      let latest = mine[0] || null;

      if (latest?.pdfPath) {
        // If it's a Cloudinary URL, keep it as-is
        // If it's a relative path, prepend backend URL
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        if (latest.pdfPath && !latest.pdfPath.startsWith('http') && !latest.pdfPath.startsWith('https')) {
          latest.pdfPath = `${backendUrl.replace(/\/$/, '')}/${latest.pdfPath.replace(/^\/+/, '')}`;
        }
        localStorage.setItem('latestSubmission', JSON.stringify(latest));
      } else {
        const cached = localStorage.getItem('latestSubmission');
        // Only use cache if it belongs to the current user
        if (cached) {
          const cachedData = JSON.parse(cached);
          if (cachedData?.employeeNumber === user?.employeeNumber) {
            latest = cachedData;
          }
        }
      }

      setSubmission(latest);
    } catch (err) {
      console.error('Error fetching submission:', err);
      setSubmission(null);
    } finally {
      setLoadingSubmission(false);
    }
  }, [user]);

  // Fetch ID Cards
  const fetchIdCards = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCards(true);
    try {
      const { data } = await api.get(`/api/idcards/${user.id}`);
      const cards = Array.isArray(data) ? data : [];
      setIdCards(cards);
      if (cards?.[0]?.cleanPhotoUrl) setUploadcareUrl(cards[0].cleanPhotoUrl);
    } catch (err) {
      console.warn('Fetch ID cards failed:', err);
      setIdCards([]);
      setUploadcareUrl(null);
    } finally {
      setLoadingCards(false);
    }
  }, [user]);

  // ✅ FIXED: Removed fetchSubmissions/fetchIdCards from dependencies
  // They're recreated on each render, causing infinite loop
  useEffect(() => {
    if (user && user.role !== 'CLIENT') navigate('/login');
    fetchSubmissions();
    fetchIdCards();
  }, [user, navigate]);

  // ✅ OPTIMIZED: Preload TensorFlow scripts once when component mounts
  // This prevents 50MB+ download on first photo upload
  useEffect(() => {
    // Preload in background
    const preloadScripts = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.9.0/dist/tf.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0.5/dist/body-pix.min.js');
        console.log('✅ TensorFlow & BodyPix preloaded');
      } catch (err) {
        console.warn('Failed to preload ML libraries:', err);
      }
    };
    preloadScripts();
  }, []);

  // Load external script helper
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  // Browser-side background removal using BodyPix (via CDN). Returns Blob PNG.
  const removeBackgroundInBrowser = async (imageUrl) => {
    try {
      // load tfjs + body-pix UMD builds
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.9.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0.5/dist/body-pix.min.js');

      // create an image element from the URL
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imageUrl;
      });

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // load BodyPix model
      const net = await window.bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      });

      // segmentation
      const segmentation = await net.segmentPerson(img, {
        internalResolution: 'medium',
        segmentationThreshold: 0.7,
      });

      // apply mask: make background transparent
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const segData = segmentation.data; // 1 for person, 0 for background

      for (let i = 0, p = 0; i < segData.length; i++, p += 4) {
        if (!segData[i]) {
          data[p + 3] = 0; // set alpha to 0 for background pixel
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // downsize if huge (optional): keep original for quality
      return await new Promise((resolve) =>
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92)
      );
    } catch (err) {
      console.warn('Browser bg removal failed:', err);
      return null;
    }
  };

  // === MOVE: robust resolver must be defined before handler ===
  const resolveUploadcareRawUrl = (fileInfo) => {
    if (!fileInfo) return null;
    // Debug log full object (helps when widget returns unexpected shape)
    console.debug('Uploadcare fileInfo:', fileInfo);

    // Try known direct URL fields first
    const cdnCandidates = [
      fileInfo.cdnUrl,
      fileInfo.cdn_url,
      fileInfo.cdnURL,
      fileInfo.originalUrl,
      fileInfo.original_url,
      fileInfo.fileUrl,
      fileInfo.secure_url,
      // nested shapes
      fileInfo.file && fileInfo.file.cdnUrl,
      fileInfo.file && fileInfo.file.cdn_url,
      fileInfo.file && fileInfo.file.originalUrl,
      fileInfo.file && fileInfo.file.secure_url,
    ];
    for (const v of cdnCandidates) {
      if (v && typeof v === 'string') {
        return v;
      }
    }

    // Uploadcare sometimes returns just a UUID or an object containing it
    const uuidCandidates = [
      fileInfo.uuid,
      fileInfo.file && (fileInfo.file.uuid || fileInfo.file.id || fileInfo.file.file_id),
      fileInfo.id,
      fileInfo.file_id,
      fileInfo.file && fileInfo.file_id,
    ];
    for (const u of uuidCandidates) {
      if (u && typeof u === 'string') {
        const cleaned = u.replace(/^\/+|\/+$/g, '');
        const built = `https://ucarecdn.com/${cleaned}/`;
        console.debug('Built Uploadcare CDN URL from uuid-like value:', built);
        // small user hint (non-blocking)
        toast('Uploadcare returned an ID only — using constructed CDN URL. If image not visible, check Uploadcare project/public settings.');
        return built;
      }
    }

    // nothing usable
    return null;
  };

  // Main Uploadcare handler (modified): try client-side removal and upload cleaned image to backend
  const handleUploadcareDone = async (fileInfoOrResult) => {
    const fileInfo = fileInfoOrResult?.fileInfo || fileInfoOrResult;
    // Resolve raw URL robustly (may return a constructed ucarecdn URL from uuid)
    let rawUrl = resolveUploadcareRawUrl(fileInfo);

    // If we only have an ID/UUID (no cdnUrl), try Uploadcare info endpoint to get an official cdn_url
    const publicKey = import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || '42db570f1392dabdf82b';
    const idCandidate = fileInfo?.uuid || fileInfo?.file_id || fileInfo?.id;
    
    // ✅ OPTIMIZED: Skip extra API call if we already have a URL
    if (!rawUrl && idCandidate) {
      try {
        const infoUrl = `https://upload.uploadcare.com/info/?jsonerrors=1&pub_key=${encodeURIComponent(publicKey)}&file_id=${encodeURIComponent(idCandidate)}`;
        const r = await fetch(infoUrl);
        if (r.ok) {
          const info = await r.json();
          const candidate = info?.cdn_url || info?.cdnUrl || info?.original_url || info?.originalUrl;
          if (candidate && typeof candidate === 'string') {
            rawUrl = candidate;
            console.debug('Resolved Uploadcare info cdn_url:', rawUrl);
          }
        }
      } catch (e) {
        console.warn('Uploadcare info fetch failed:', e);
      }
    }

    if (!rawUrl) {
      console.warn('Uploadcare returned no usable URL or UUID:', fileInfo);
      toast.error('Uploadcare did not return a usable URL. Check widget settings.');
      return;
    }

    // If the uploader returned only a UUID (no cdnUrl), inform user (we build CDN URL)
    if (!fileInfo?.cdnUrl && (fileInfo?.uuid || fileInfo?.id || fileInfo?.file)) {
      toast((t) => (
        <span>
          Uploaded to Uploadcare (UUID). Using constructed CDN URL — if image not visible check Uploadcare settings.
        </span>
      ));
    }

    // optimistic preview using Uploadcare transform (may be premium)
    setUploadcareUrl(`${rawUrl}-/remove_bg/`);

    const card = idCards[0];
    if (!card) {
      toast.error('No placeholder ID card found. Create one first.');
      return;
    }

    setUploadingPhoto(true);
    try {
      // 1) Save raw URL so backend always has it
      await api.put(`/api/idcards/${card.id}/photo`, { rawPhotoUrl: rawUrl });

      toast.success('Photo uploaded. Starting background removal…');
      setIsCleaning(true);
      setCleanProgress(0);

      // 2) Try browser-side removal (unchanged)
      const cleanedBlob = await removeBackgroundInBrowser(rawUrl);

      if (cleanedBlob) {
        const fd = new FormData();
        fd.append('cleanImage', cleanedBlob, `clean_${card.id}_${Date.now()}.png`);
        const uploadResp = await api.post(`/api/idcards/${card.id}/upload-clean`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => {
            if (ev.total) {
              const pct = Math.round((ev.loaded / ev.total) * 100);
              setCleanProgress(pct);
            }
          },
        });

        const updatedCard = uploadResp.data.card;
        setIdCards([updatedCard]);
        setUploadcareUrl(updatedCard.cleanPhotoUrl);
        toast.success('✅ Background removed and saved (client-side).');
      } else {
        // NEW: If browser-side removal failed (CORS or model failure),
        // ask backend to fetch the raw image and attempt server-side cleaning (or at least persist a local copy).
        try {
          toast('Browser removal failed; asking server to fetch and attempt cleaning…');
          const resp = await api.post(`/api/idcards/${card.id}/fetch-and-clean`, { rawPhotoUrl: rawUrl });
          const updatedCard = resp.data.card;
          setIdCards([updatedCard]);
          setUploadcareUrl(updatedCard.cleanPhotoUrl);
          toast.success('✅ Server fetched and saved cleaned image (or fallback image).');
        } catch (err) {
          console.error('Server fetch-and-clean failed:', err?.response?.data || err);
          // fallback: try Uploadcare transform (may not work on free plan)
          await api.put(`/api/idcards/${card.id}/clean-photo`);
          await fetchIdCards();
          toast.success('✅ Cleaned via Uploadcare transform (fallback).');
        }
      }
    } catch (err) {
      console.error('Error processing upload:', err?.response?.data || err);
      toast.error('Photo upload/clean failed.');
    } finally {
      setUploadingPhoto(false);
      setIsCleaning(false);
      setCleanProgress(0);
    }
  };

  const onUploadcareChange = (filePromiseOrInfo) => {
    // File object with .done (Uploadcare widget) — prefer done callback
    if (filePromiseOrInfo && typeof filePromiseOrInfo.done === 'function') {
      filePromiseOrInfo.done((fileInfo) => {
        console.debug('Uploadcare .done result:', fileInfo);
        handleUploadcareDone(fileInfo);
      });
      return;
    }
    // If passed a promise-like with .then
    if (filePromiseOrInfo && typeof filePromiseOrInfo.then === 'function') {
      filePromiseOrInfo.then((fileInfo) => {
        console.debug('Uploadcare promise result:', fileInfo);
        handleUploadcareDone(fileInfo);
      }).catch((err) => {
        console.warn('Uploadcare promise failed:', err);
        toast.error('Upload failed.');
      });
      return;
    }
    // Otherwise handle direct info
    console.debug('Uploadcare direct info:', filePromiseOrInfo);
    handleUploadcareDone(filePromiseOrInfo);
  };

  // Manual re-clean trigger
  const handleReClean = async (cardId) => {
    setIsCleaning(true);
    setCleanProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setCleanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 20;
        });
      }, 300);

      await api.put(`/api/idcards/${cardId}/clean-photo`);
      await fetchIdCards();
      toast.success('Photo re-cleaned!');
    } catch (err) {
      console.error(err);
      toast.error('Re-clean failed.');
    } finally {
      setIsCleaning(false);
      setCleanProgress(0);
    }
  };

  // Section control
  const section = location.pathname.endsWith('/pdf')
    ? 'pdf'
    : location.pathname.endsWith('/idcards')
    ? 'idcards'
    : location.pathname.endsWith('/generate')
    ? 'generate'
    : location.pathname.endsWith('/publications')
    ? 'publications'
    : 'overview';

  const getCardRole = () => 'Member';

  // Helper to download a remote file as a proper PDF file
  const downloadPdf = async (url, filenameFallback) => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const blob = await res.blob();

      // Try content-disposition
      let filename = filenameFallback || 'form.pdf';
      const cd = res.headers.get('content-disposition');
      if (cd) {
        const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
        if (m && m[1]) filename = decodeURIComponent(m[1]);
      } else {
        // Try to derive from URL path
        try {
          const u = new URL(url);
          const part = u.pathname.split('/').pop();
          if (part && /\.pdf$/i.test(part)) filename = part;
        } catch (e) {
          /* ignore */
        }
      }
      if (!/\.pdf$/i.test(filename)) filename = `${filename}.pdf`;

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('PDF download failed:', err);
      toast.error('Download failed — opening in a new tab');
      window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      {section === 'overview' && (
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Hello, {user.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Last Submission</h3>
              <p className="text-gray-600">
                {loadingSubmission ? 'Loading…' : submission ? new Date(submission.submittedAt).toLocaleDateString() : 'None'}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">ID Cards Created</h3>
              <p className="text-gray-600">{loadingCards ? 'Loading…' : idCards.length}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Role / Title</h3>
              <p className="text-gray-600">{getCardRole()}</p>
            </div>
          </div>
        </div>
      )}

      {/* PDF */}
      {section === 'pdf' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Your Generated PDF Form</h2>
          {submission?.pdfPath ? (
            <button
              onClick={() =>
                downloadPdf(
                  submission.pdfPath,
                  submission.originalFilename || `form_${submission.employeeNumber || user?.employeeNumber || 'form'}.pdf`
                )
              }
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              <FaFilePdf className="mr-2" /> Download Form
            </button>
          ) : (
            <p className="text-gray-500">You haven’t generated your form PDF yet.</p>
          )}
        </div>
      )}

      {/* ID Cards */}
      {section === 'idcards' && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-4">Your ID Cards</h2>
          {loadingCards ? (
            <p className="text-gray-500">Loading…</p>
          ) : idCards.length === 0 ? (
            <p className="text-gray-500">No ID cards found.</p>
          ) : (
            <div className="space-y-8">
              {idCards.map((card) => (
                <div key={card.id}>
                  <IDCard card={card} />
                  {card.rawPhotoUrl && (
                    <button
                      onClick={() => handleReClean(card.id)}
                      disabled={isCleaning}
                      className={`mt-2 px-3 py-1 rounded text-white ${
                        isCleaning ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                    >
                      <FaRedo className="inline mr-1" /> Re-clean Photo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {isCleaning && (
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${cleanProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Generate / Uploadcare */}
      {section === 'generate' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4">Add Your Photo</h2>
          {loadingCards ? (
            <p className="text-gray-500">Loading placeholder card…</p>
          ) : idCards.length === 0 ? (
            <p className="text-red-500">You need a placeholder card first.</p>
          ) : (
            <>
              <div className="mb-4 space-y-1">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Company:</strong> {idCards[0]?.company || submission?.employerName || 'N/A'}</p>
                <p><strong>Role / Title:</strong> {getCardRole()}</p>
                <p><strong>Card #:</strong> {idCards[0].cardNumber}</p>
              </div>

              <div className="mb-3">
                <FileUploaderRegular
                  pubkey={import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || "42db570f1392dabdf82b"}
                  multiple={false}
                  sourceList="local, camera, url"
                  onChange={onUploadcareChange}
                  disabled={uploadingPhoto || isCleaning}
                />
              </div>

              {uploadingPhoto && <p className="text-blue-600 mt-2 font-semibold">Uploading / processing…</p>}
              {isCleaning && (
                <div className="mt-2">
                  <p className="text-yellow-600 font-semibold">Cleaning photo… {cleanProgress}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${cleanProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {uploadcareUrl && (
                <div className="mt-4">
                  <p className="font-semibold">Latest Photo:</p>
                  <img
                    src={uploadcareUrl}
                    alt="uploadcare-preview"
                    className="w-48 h-48 object-cover rounded shadow"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Password Notice */}
      <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-md flex items-center mt-6">
        <FaLock className="mr-2" />
        <span>
          If you haven’t changed your password,{' '}
          <button onClick={() => openChangePwModal(true)} className="underline font-semibold text-blue-600">
            click here
          </button>.
        </span>
      </div>
    </div>
  );
}
