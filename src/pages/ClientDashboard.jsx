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

// Helper hook for Object URLs
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

  // Robust handler for Uploadcare onChange
  // Uploadcare onChange may provide:
  //  - a "filePromise" with .done(handler)
  //  - or a plain fileInfo object (depending on version / config)
  // So we handle both safely.
  const handleUploadcareDone = async (fileInfoOrResult) => {
    // fileInfoOrResult might be the direct fileInfo, or an object from .done()
    const fileInfo = fileInfoOrResult?.fileInfo || fileInfoOrResult;
    if (!fileInfo?.cdnUrl) {
      toast.error('Uploadcare did not return a cdnUrl.');
      return;
    }

    setUploadcareUrl(fileInfo.cdnUrl);

    // find placeholder card
    const card = idCards[0];
    if (!card) {
      toast.error('No placeholder ID card found. Create one first.');
      return;
    }

    // Tell backend the Uploadcare URL — backend should save rawPhotoUrl (and optionally set a clean url)
    setUploadingPhoto(true);
    setIsCleaning(true);
    try {
      // NOTE: backend route used here: PUT /api/idcards/:id/photo
      // body: { rawPhotoUrl: '<uploadcare-cdn-url>' }
      await api.put(`/api/idcards/${card.id}/photo`, { rawPhotoUrl: fileInfo.cdnUrl });
      toast.success('Photo linked successfully!');
      await fetchIdCards();
    } catch (err) {
      console.error('Error linking photo URL:', err?.response?.data || err?.message || err);
      toast.error('Linking photo failed. Check console.');
    } finally {
      setUploadingPhoto(false);
      setIsCleaning(false);
    }
  };

  // wrapper used by the component onChange
  const onUploadcareChange = (filePromiseOrInfo) => {
    // If Uploadcare returns a "filePromise" (object with .done), call .done()
    if (filePromiseOrInfo && typeof filePromiseOrInfo.done === 'function') {
      // filePromiseOrInfo.done accepts a callback that receives the final fileInfo
      try {
        filePromiseOrInfo.done((fileInfo) => {
          handleUploadcareDone(fileInfo);
        });
      } catch (err) {
        // fallback: try calling handler with whatever we got
        console.warn('Uploadcare .done call failed, trying direct pass-through', err);
        handleUploadcareDone(filePromiseOrInfo);
      }
      return;
    }

    // Otherwise it's likely already the fileInfo object
    handleUploadcareDone(filePromiseOrInfo);
  };

  const handleReClean = async (cardId) => {
    setIsCleaning(true);
    try {
      await api.put(`/api/idcards/${cardId}/clean-photo`);
      toast.success('Photo re-cleaned!');
      await fetchIdCards();
    } catch (err) {
      console.error(err);
      toast.error('Re-clean failed.');
    } finally {
      setIsCleaning(false);
    }
  };

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
                      className={`mt-2 px-3 py-1 rounded text-white ${isCleaning ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                    >
                      <FaRedo className="inline mr-1" /> Re-clean Photo
                    </button>
                  )}
                </div>
              ))}
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
                  pubkey="42db570f1392dabdf82b"
                  multiple={false}
                  sourceList="local, camera, url"
                  onChange={onUploadcareChange}
                  disabled={uploadingPhoto || isCleaning}
                />
              </div>

              {uploadingPhoto && <p className="text-blue-600 mt-2 font-semibold">Uploading / processing…</p>}

              {uploadcareUrl && (
                <div className="mt-4">
                  <p className="font-semibold">Latest Photo:</p>
                  <img src={uploadcareUrl} alt="uploadcare-preview" className="w-48 h-48 object-cover rounded shadow" />
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
          <button onClick={() => openChangePwModal(true)} className="underline font-semibold text-blue-600">click here</button>.
        </span>
      </div>
    </div>
  );
}
