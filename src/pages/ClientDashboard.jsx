// src/pages/ClientDashboard.jsx

import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChangePwModalContext } from '../components/DashboardLayout'
import {
  FaUserCircle,
  FaFilePdf,
  FaIdCard,
  FaPlusCircle,
  FaBook,
  FaLock
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

//import ReactToPrint from 'react-to-print';
import IDCard from '../components/IDCard';

export default function ClientDashboard() {
  const openChangePwModal = useContext(ChangePwModalContext)
  const navigate = useNavigate();
  const location = useLocation();
  const webcamRef = useRef(null);
  const [isCleaning, setIsCleaning] = useState(false);


  // inside your function component:
  const componentRef = useRef();
  // --- User Auth ---
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem('fibuca_user');
    if (!raw) return navigate('/login');
    const me = JSON.parse(raw);
    if (me.role !== 'CLIENT') return navigate('/login');
    setUser(me);
  }, [navigate]);

  // --- Submission (to get company) ---
  const [submission, setSubmission] = useState(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);

  useEffect(() => {
  if (!user) return;

  (async () => {
    setLoadingSubmission(true);
    try {
      const res = await api.get('/submissions');

      // Normalize response to ensure it's an array
      const data = Array.isArray(res.data) ? res.data : [];

      const mine = data
        .filter((s) => s.employeeNumber === user.employeeNumber)
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );

      if (mine.length > 0) {
        setSubmission(mine[0]);
      } else {
        setSubmission(null); // fallback if no match
      }
    } catch (err) {
      console.error('❌ Error fetching submission:', err);
      setSubmission(null); // fallback on error
    } finally {
      setLoadingSubmission(false);
    }
  })();
}, [user]);

  // --- ID Cards State & Fetch Logic ---
  const [idCards, setIdCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // 1) fetchIdCards defined inside component
const fetchIdCards = useCallback(async () => {
  if (!user?.id) return;
  setLoadingCards(true);
  try {
const { data } = await api.get(
  `/api/idcards/${user.id}`,
  { headers: { 'ngrok-skip-browser-warning': '1' } }
)

    const safeCards = Array.isArray(data) ? data : [];
    setIdCards(safeCards);
  } catch (err) {
    console.warn('❌ Fetch ID cards failed, defaulting to empty:', err);
    setIdCards([]);
  } finally {
    setLoadingCards(false);
  }
}, [user]);

  // 2) call fetch on mount or when user changes
  useEffect(() => {
    fetchIdCards();
  }, [fetchIdCards]);

  // --- Photo Upload State ---
  const [photo, setPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  // --- Utility Functions ---
  const getCardRole = () => {
    if (user.role === 'ADMIN') return 'Mwenyekiti';
    if (user.role === 'SUPERADMIN') return 'Katibu';
    return 'Member';
  };

  const generateCardNumber = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const part = Array.from({ length: 2 })
      .map(() => letters[Math.floor(Math.random() * letters.length)])
      .join('');
    const digits = Math.floor(100000 + Math.random() * 900000);
    return `FIBUCA${part}${digits}`;
  };

  // --- Webcam Capture ---
  const capturePhoto = () => {
    const dataUrl = webcamRef.current?.getScreenshot();
    if (!dataUrl) return;
    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        setPhoto(file);
        setShowCamera(false);
      })
      .catch(console.error);
  };

  // --- Handle Photo Submit (PUT photo to existing card) ---




  const handlePhotoSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return alert('Please upload or capture a photo.');

    const card = idCards[0];
    if (!card) return alert('No placeholder ID card found.');

    const formData = new FormData();
    formData.append('photo', photo);

    setIsCleaning(true); // 🌀 Start spinner

    try {
await api.put(
  `/api/idcards/${card.id}/photo`,
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data',
      'ngrok-skip-browser-warning': '1'
    }
  }
)
      console.log('✅ Photo uploaded');

      await api.put(
        `/api/idcards/${card.id}/clean-photo`
      );
      console.log('✅ Background removed');

      //alert('ID card photo uploaded and cleaned!');
      toast.success('✅ Photo uploaded and cleaned!');
      await fetchIdCards();
      navigate('/client/idcards');
    } catch (err) {
      console.error('❌ Upload or cleanup failed:', err);
      //alert('Failed to upload or clean photo');
      toast.error('❌ Upload or cleanup failed');
    } finally {
      setIsCleaning(false); // 🛑 Stop spinner
    }
  };

  if (!user) return null;

  // decide which panel to show based on URL
  const path = location.pathname;
  let section = 'overview';
  if (path.endsWith('/pdf')) section = 'pdf';
  else if (path.endsWith('/idcards')) section = 'idcards';
  else if (path.endsWith('/generate')) section = 'generate';
  else if (path.endsWith('/publications')) section = 'publications';

  // sidebar menu config
  const menus = [
    { href: '/client', label: 'Overview', icon: FaUserCircle },
    { href: '/client/pdf', label: 'PDF Form', icon: FaFilePdf },
    { href: '/client/generate', label: 'Generate ID', icon: FaPlusCircle },
    { href: '/client/idcards', label: 'Your ID Cards', icon: FaIdCard },

    { href: '/client/publications', label: 'Publications', icon: FaBook }
  ];

  return (

    <div className="space-y-6">
      {/* ===== Overview ===== */}
      {section === 'overview' && (
        <div>
          <h1 className="text-2xl font-bold text-blue-700">
            Hello, {user.name}
          </h1>
          {/* quick stats */}
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
              <p className="text-gray-600">
                {loadingCards ? 'Loading…' : idCards.length}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Your Role | title </h3>
              <p className="text-gray-600">{getCardRole()}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Your PDF Form ===== */}
      {section === 'pdf' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">
            Your Generated PDF Form
          </h2>
          {user.pdfPath ? (
            <a
              href={`/${user.pdfPath}`.replace(
                /\\/g,
                '/'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              <FaFilePdf className="mr-2" />
              Download Form
            </a>
          ) : (
            <p className="text-gray-500">
              You haven’t generated your form PDF yet.
            </p>
          )}
        </div>
      )}

      {/* ===== Your ID Cards ===== */}
      {section === 'idcards' && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-4">
            Your ID Cards
          </h2>

          {loadingCards ? (
            <p className="text-gray-500">Loading…</p>
          ) : idCards.length === 0 ? (
            <p className="text-gray-500">No ID cards found.</p>
          ) : (
            <div className="space-y-8">
              {idCards.map((card) => (
                <div key={card.id} className="mb-6">

                  <div className="print-container inline-block">
                    {/* 1) Live Preview */}
                    <IDCard ref={componentRef} card={card} />

                    {/* 2) Print Button */}

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ===== Generate ID (Upload/Capture Photo) ===== */}
      {section === 'generate' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4">Add Your Photo</h2>

          {loadingCards ? (
            <p className="text-gray-500">Loading placeholder card…</p>
          ) : idCards.length === 0 ? (
            <p className="text-red-500">
              You need a placeholder card. Check “Overview.”
            </p>
          ) : (
            <>
              <div className="mb-4 space-y-1">
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Company:</strong>{' '}
                  {idCards[0]?.company || submission?.employerName || 'N/A'}
                </p>

                <p>
                  <strong>Role | Title:</strong> {getCardRole()}
                </p>
                <p>
                  <strong>Card #:</strong> {idCards[0].cardNumber}
                </p>
              </div>

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
                    />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Capture Photo
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Upload Photo
                </button>

                {/* Spinner goes here */}
                {isCleaning && (
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

      {/* ===== Publications ===== */}
      {section === 'publications' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4">Publications & Media</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <a
                href="/fibuca-magazine-june2025.pdf"
                className="text-blue-600 hover:underline"
              >
                Monthly Magazine – June 2025
              </a>
            </li>
            <li>
              <a
                href="/fibuca-press-release-april.pdf"
                className="text-blue-600 hover:underline"
              >
                Press Release – April
              </a>
            </li>
            <li>
              <a
                href="/fibuca-gallery"
                className="text-blue-600 hover:underline"
              >
                Media Gallery
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* ===== Password Notice ===== */}
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
