import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChangePwModalContext } from '../components/DashboardLayout';
import { FaFilePdf, FaIdCard, FaRedo, FaLock } from 'react-icons/fa';
import Webcam from 'react-webcam';
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
  const webcamRef = useRef(null);
  const componentRef = useRef();

  const { user } = useAuth();

  const [isCleaning, setIsCleaning] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [idCards, setIdCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [photo, setPhoto] = useState(null);
  const [cleanedPhotoUrl, setCleanedPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadcareUrl, setUploadcareUrl] = useState(null);

  const photoPreviewUrl = useObjectUrl(photo);

  // Role restriction
  useEffect(() => {
    if (user && user.role !== 'CLIENT') navigate('/login');
  }, [user, navigate]);

  // Fetch submission
  useEffect(() => {
    if (!user) return;
    const fetchSubmissions = async () => {
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
    };
    fetchSubmissions();
  }, [user]);

  // Fetch ID cards
  const fetchIdCards = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCards(true);
    try {
      const { data } = await api.get(`/api/idcards/${user.id}`);
      const cards = Array.isArray(data) ? data : [];
      setIdCards(cards);
      if (cards?.[0]?.photoUrl && cards[0].photoUrl !== cleanedPhotoUrl) {
        setCleanedPhotoUrl(cards[0].photoUrl);
      }
    } catch (err) {
      console.warn('Fetch ID cards failed:', err);
      setIdCards([]);
      setCleanedPhotoUrl(null);
    } finally {
      setLoadingCards(false);
    }
  }, [user, cleanedPhotoUrl]);

  useEffect(() => {
    fetchIdCards();
  }, [fetchIdCards]);

  // Capture photo from webcam
  const capturePhoto = () => {
    const dataUrl = webcamRef.current?.getScreenshot();
    if (!dataUrl) return;
    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhoto(file);
        setShowCamera(false);
      })
      .catch(console.error);
  };

  // Handle Uploadcare result
  const handleUploadcareDone = async (fileInfo) => {
    if (!fileInfo?.cdnUrl) return toast.error('Upload failed.');
    setUploadcareUrl(fileInfo.cdnUrl);

    const card = idCards[0];
    if (!card) return toast.error('No placeholder ID card found.');

    setUploadingPhoto(true);
    setIsCleaning(true);
    try {
      const res = await api.put(`/api/idcards/${card.id}/photo-url`, { photoUrl: fileInfo.cdnUrl });
      toast.success('Photo linked successfully!');
      await fetchIdCards();
      setCleanedPhotoUrl(fileInfo.cdnUrl);
    } catch (err) {
      console.error('Error linking photo URL:', err);
      toast.error('Linking failed.');
    } finally {
      setUploadingPhoto(false);
      setIsCleaning(false);
    }
  };

  const path = location.pathname;
  const section = path.endsWith('/pdf')
    ? 'pdf'
    : path.endsWith('/idcards')
    ? 'idcards'
    : path.endsWith('/generate')
    ? 'generate'
    : path.endsWith('/publications')
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
                {loadingSubmission
                  ? 'Loading…'
                  : submission
                  ? new Date(submission.submittedAt).toLocaleDateString()
                  : 'None'}
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
            <a
              href={encodeURI(submission.pdfPath)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline"
            >
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
                  <IDCard ref={componentRef} card={card} />
                  {card.photoUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsCleaning(true);
                        try {
                          await api.put(`/api/idcards/${card.id}/clean-photo`);
                          toast.success('Photo re-cleaned!');
                          await fetchIdCards();
                        } catch (err) {
                          toast.error('Re-clean failed.');
                        } finally {
                          setIsCleaning(false);
                        }
                      }}
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
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Company:</strong> {idCards[0]?.company || submission?.employerName || 'N/A'}
                </p>
                <p>
                  <strong>Role / Title:</strong> {getCardRole()}
                </p>
                <p>
                  <strong>Card #:</strong> {idCards[0].cardNumber}
                </p>
              </div>

              {/* Uploadcare uploader */}
              <div className="my-4">
                <FileUploaderRegular
                  pubkey="42db570f1392dabdf82b"
                  multiple={false}
                  sourceList="local, camera, url"
                  onChange={(filePromise) => {
                    filePromise.done(handleUploadcareDone);
                  }}
                />
              </div>

              {uploadcareUrl && (
                <div>
                  <p className="font-semibold">Uploaded via Uploadcare:</p>
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

      {/* Publications */}
      {section === 'publications' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4">Publications & Media</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <a href="/fibuca-magazine-june2025.pdf" className="text-blue-600 hover:underline">
                Monthly Magazine – June 2025
              </a>
            </li>
            <li>
              <a href="/fibuca-press-release-april.pdf" className="text-blue-600 hover:underline">
                Press Release – April
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* Password */}
      <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-md flex items-center mt-6">
        <FaLock className="mr-2" />
        <span>
          If you haven’t changed your password,{' '}
          <button
            onClick={() => openChangePwModal(true)}
            className="underline font-semibold text-blue-600"
          >
            click here
          </button>
          .
        </span>
      </div>
    </div>
  );
}
