// src/pages/ClientDashboard.jsx
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChangePwModalContext } from '../components/DashboardLayout';
import { FaFilePdf, FaIdCard, FaRedo, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import IDCard from '../components/IDCard';

// Hook to generate object URL for previewing File objects
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);

  // ---------------------- FETCH FUNCTIONS ----------------------
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

      // Handle pdfPath URL
      if (latest?.pdfPath && !latest.pdfPath.startsWith('http')) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        latest.pdfPath = `${backendUrl.replace(/\/$/, '')}/${latest.pdfPath.replace(/^\/+/, '')}`;
      } else {
        const cached = localStorage.getItem('latestSubmission');
        if (cached) {
          const cachedData = JSON.parse(cached);
          if (cachedData?.employeeNumber === user?.employeeNumber) {
            latest = cachedData;
          }
        }
      }

      setSubmission(latest);
      if (latest) localStorage.setItem('latestSubmission', JSON.stringify(latest));
    } catch (err) {
      console.error('Error fetching submission:', err);
      setSubmission(null);
    } finally {
      setLoadingSubmission(false);
    }
  }, [user]);

  const fetchIdCards = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCards(true);
    try {
      const { data } = await api.get(`/api/idcards/${user.id}`);
      const cards = Array.isArray(data) ? data : [];
      setIdCards(cards);
    } catch (err) {
      console.warn('Fetch ID cards failed:', err);
      setIdCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role !== 'CLIENT') navigate('/login');
    fetchSubmissions();
    fetchIdCards();
  }, [user, navigate]);

  // ---------------------- EXTERNAL SCRIPTS ----------------------
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  useEffect(() => {
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

  // ---------------------- IMAGE PROCESSING ----------------------
  const removeBackgroundInBrowser = async (imageUrl) => {
    try {
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

      const net = await window.bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      });

      const segmentation = await net.segmentPerson(img, {
        internalResolution: 'medium',
        segmentationThreshold: 0.7,
      });

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const segData = segmentation.data;

      for (let i = 0, p = 0; i < segData.length; i++, p += 4) {
        if (!segData[i]) data[p + 3] = 0;
      }

      ctx.putImageData(imgData, 0, 0);

      return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));
    } catch (err) {
      console.warn('Browser bg removal failed:', err);
      return null;
    }
  };


  // handle direct file selection from user
  const handleFileUpload = async (file) => {
    if (!file) return;
    const card = idCards[0];
    if (!card) return toast.error('No placeholder ID card found.');

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file, file.name);
      const uploadResp = await api.put(`/api/idcards/${card.id}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) setCleanProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      const updated = uploadResp.data.card;
      setIdCards([updated]);
      toast.success('✅ Photo uploaded and background removed.');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Photo upload/clean failed.');
    } finally {
      setUploadingPhoto(false);
      setCleanProgress(0);
    }
  };


  const handleReClean = async (cardId) => {
    setIsCleaning(true);
    setCleanProgress(0);
    try {
      const interval = setInterval(() => setCleanProgress((p) => (p >= 100 ? (clearInterval(interval), 100) : p + 20)), 300);
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

  // ---------------------- PDF DOWNLOAD ----------------------
  const downloadPdf = async (url, filenameFallback) => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filenameFallback || 'form.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('PDF download failed:', err);
      toast.error('Download failed — opening in a new tab');
      window.open(url, '_blank', 'noopener');
    }
  };

  // ---------------------- UI CONTROL ----------------------
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

  // ---------------------- RENDER ----------------------
  return (
    <div className="space-y-6">
      {/* Overview */}
      {section === 'overview' && (
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Hello, {user.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Last Submission</h3>
              <p className="text-gray-600">{loadingSubmission ? 'Loading…' : submission ? new Date(submission.submittedAt).toLocaleDateString() : 'None'}</p>
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

      {/* PDF Section */}
      {section === 'pdf' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Your Generated PDF Form</h2>
          {submission?.pdfPath ? (
            <button
              onClick={() => downloadPdf(submission.pdfPath, submission.originalFilename || `form_${user.employeeNumber}.pdf`)}
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
                      className={`mt-2 px-3 py-1 rounded text-white ${isCleaning ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'}`}
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
              <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{ width: `${cleanProgress}%` }}></div>
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  disabled={uploadingPhoto || isCleaning}
                  className="block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer focus:outline-none"
                />
              </div>

              {uploadingPhoto && <p className="text-blue-600 mt-2 font-semibold">Uploading / processing…</p>}

              {isCleaning && (
                <div className="mt-2">
                  <p className="text-yellow-600 font-semibold">Cleaning photo… {cleanProgress}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                    <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{ width: `${cleanProgress}%` }}></div>
                  </div>
                </div>
              )}

              {idCards[0]?.cleanPhotoUrl && (
                <div className="mt-4">
                  <p className="font-semibold">Latest Photo:</p>
                  <img src={idCards[0]?.cleanPhotoUrl} alt="photo-preview" className="w-48 h-48 object-cover rounded shadow" />
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
