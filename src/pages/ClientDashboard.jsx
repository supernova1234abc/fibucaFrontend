// src/pages/ClientDashboard.jsx
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChangePwModalContext } from '../components/DashboardLayout';
import { FaFilePdf, FaIdCard, FaRedo, FaLock } from 'react-icons/fa';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import IDCard from '../components/IDCard';

// Helper hook to safely create/revoke Object URLs
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

  const photoPreviewUrl = useObjectUrl(photo);

  // Role-based access
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'CLIENT') navigate('/login');
  }, [user, navigate]);

  // Fetch submissions with localStorage persistence
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

  // Handle photo upload
  const handlePhotoSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return toast.error('Please upload or capture a photo.');

    const card = idCards[0];
    if (!card) return toast.error('No placeholder ID card found.');

    const formData = new FormData();
    formData.append('photo', photo);

    setUploadingPhoto(true);
    setIsCleaning(true);

    try {
      const res = await api.put(`/api/idcards/${card.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Photo uploaded and cleaned!');
      await fetchIdCards();
      setPhoto(null);
      setCleanedPhotoUrl(res.data?.cleanedUrl || null);
    } catch (err) {
      console.error('Upload or cleanup failed:', err.response?.data || err.message);
      toast.error('Upload failed. Check console.');
    } finally {
      setUploadingPhoto(false);
      setIsCleaning(false);
      setShowCamera(false);
    }
  };

  // Re-clean existing photo
  const handleReCleanPhoto = async () => {
    const card = idCards[0];
    if (!card || !card.photoUrl) return toast.error('No existing photo to clean.');

    setIsCleaning(true);
    try {
      await api.put(`/api/idcards/${card.id}/clean-photo`);
      toast.success('Photo re-cleaned!');
      await fetchIdCards();
    } catch (err) {
      console.error('Re-clean failed:', err.response?.data || err.message);
      toast.error('Re-clean failed.');
    } finally {
      setIsCleaning(false);
    }
  };

  if (!user) return null;

  const path = location.pathname;
  let section = 'overview';
  if (path.endsWith('/pdf')) section = 'pdf';
  else if (path.endsWith('/idcards')) section = 'idcards';
  else if (path.endsWith('/generate')) section = 'generate';
  else if (path.endsWith('/publications')) section = 'publications';

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

      {/* PDF Form */}
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
                      onClick={handleReCleanPhoto}
                      disabled={isCleaning}
                      className={`mt-2 px-3 py-1 rounded text-white ${
                        isCleaning
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-yellow-600 hover:bg-yellow-700'
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

      {/* Generate ID */}
      {section === 'generate' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4">Add Your Photo</h2>
          {loadingCards ? (
            <p className="text-gray-500">Loading placeholder card…</p>
          ) : idCards.length === 0 ? (
            <p className="text-red-500">You need a placeholder card. Check “Overview.”</p>
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

              {/* Photo Preview */}
              {photoPreviewUrl && (
                <div className="mb-2">
                  <p className="font-semibold">Selected Photo Preview:</p>
                  <img
                    src={photoPreviewUrl}
                    alt="preview"
                    className="w-48 h-48 object-cover rounded shadow"
                  />
                </div>
              )}
              {cleanedPhotoUrl && (
                <div className="mb-2">
                  <p className="font-semibold">Latest Cleaned Photo:</p>
                  <img
                    src={cleanedPhotoUrl}
                    alt="cleaned"
                    className="w-48 h-48 object-cover rounded shadow"
                  />
                </div>
              )}

              <form onSubmit={handlePhotoSubmit} className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files[0])}
                  className="border p-2 rounded w-full"
                />

                <button
                  type="button"
                  onClick={() => setShowCamera((s) => !s)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  {showCamera ? 'Close Camera' : 'Use Camera'}
                </button>

                {showCamera && (
                  <div className="space-y-2">
                    <Webcam
                      audio={false}
                      screenshotFormat="image/jpeg"
                      ref={webcamRef}
                      className="border rounded mx-auto"
                      videoConstraints={{ facingMode: 'user' }}
                    />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={uploadingPhoto || isCleaning}
                      className={`px-4 py-2 rounded text-white ${
                        uploadingPhoto || isCleaning
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Capture Photo
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadingPhoto || isCleaning}
                  className={`px-4 py-2 rounded text-white ${
                    uploadingPhoto || isCleaning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  Upload Photo
                </button>

                {(uploadingPhoto || isCleaning) && (
                  <div className="flex items-center justify-center mt-4">
                    <div className="animate-spin h-6 w-6 border-4 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="ml-2 text-blue-600 text-sm">Processing photo...</span>
                  </div>
                )}
              </form>
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
            <li>
              <a href="/fibuca-gallery" className="text-blue-600 hover:underline">
                Media Gallery
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* Password notice */}
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
