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
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        if (!latest.pdfPath.startsWith('http')) {
          latest.pdfPath = `${backendUrl.replace(/\/$/, '')}/${latest.pdfPath.replace(/^\/+/, '')}`;
        }
        localStorage.setItem('latestSubmission', JSON.stringify(latest));
      } else {
        const cached = localStorage.getItem('latestSubmission');
        if (cached) latest = JSON.parse(cached);
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

  useEffect(() => {
    if (user && user.role !== 'CLIENT') navigate('/login');
    fetchSubmissions();
    fetchIdCards();
  }, [user, navigate, fetchSubmissions, fetchIdCards]);

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

  // Main Uploadcare handler (modified): try client-side removal and upload cleaned image to backend
  const handleUploadcareDone = async (fileInfoOrResult) => {
    const fileInfo = fileInfoOrResult?.fileInfo || fileInfoOrResult;
    if (!fileInfo?.cdnUrl) {
      toast.error('Uploadcare did not return a cdnUrl.');
      return;
    }

    const rawUrl = fileInfo.cdnUrl;
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

      // 2) Try browser-side removal
      const cleanedBlob = await removeBackgroundInBrowser(rawUrl);

      if (cleanedBlob) {
        // upload cleaned image to backend endpoint
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

        // update UI with returned card
        const updatedCard = uploadResp.data.card;
        setIdCards([updatedCard]);
        setUploadcareUrl(updatedCard.cleanPhotoUrl);
        toast.success('✅ Background removed and saved (client-side).');
      } else {
        // fallback: use Uploadcare transformation URL (may or may not work depending on plan)
        await api.put(`/api/idcards/${card.id}/clean-photo`);
        await fetchIdCards();
        toast.success('✅ Cleaned via Uploadcare transform (fallback).');
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

  // Wrapper for Uploadcare change (keeps your existing handler)
  const onUploadcareChange = (filePromiseOrInfo) => {
    if (filePromiseOrInfo && typeof filePromiseOrInfo.done === 'function') {
      filePromiseOrInfo.done((fileInfo) => handleUploadcareDone(fileInfo));
    } else {
      handleUploadcareDone(filePromiseOrInfo);
    }
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
            <a href={encodeURI(submission.pdfPath)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:underline">
              <FaFilePdf className="mr-2" /> View / Download Form
            </a>
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
