import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ClientForm() {
  const navigate = useNavigate();

  /* ===============================
     STATE
  ================================= */
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    employeeName: "",
    witnessName: "",
    dateClient: "",
    dateEmployee: "",
    dateWitness: "",
  });

  const [activeSignature, setActiveSignature] = useState(null);
  const [signatures, setSignatures] = useState({
    client: null,
    employee: null,
    witness: null,
  });

  const [showAgreement, setShowAgreement] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState(null);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);

  /* ===============================
     RESPONSIVE FIX
  ================================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = 500 * ratio;
    canvas.height = 200 * ratio;
    canvas.style.width = "100%";
    canvas.style.height = "200px";

    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctxRef.current = ctx;
  }, [activeSignature]);

  /* ===============================
     SIGNATURE DRAWING (SMOOTH + PRESSURE)
  ================================= */
  const startDrawing = (e) => {
    drawing.current = true;
    draw(e);
  };

  const endDrawing = () => {
    drawing.current = false;
    ctxRef.current.beginPath();
  };

  const draw = (e) => {
    if (!drawing.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pressure = e.pressure || 0.5;
    ctxRef.current.lineWidth = 1 + pressure * 3;

    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const saveSignature = () => {
    const image = canvasRef.current.toDataURL("image/png");
    setSignatures((prev) => ({ ...prev, [activeSignature]: image }));
    setActiveSignature(null);
  };

  /* ===============================
     INPUT HANDLER
  ================================= */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* ===============================
     SUBMIT
  ================================= */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!signatures.client || !signatures.employee || !signatures.witness) {
      alert("All signatures required.");
      return;
    }

    const username = formData.phone;
    const password = Math.random().toString(36).slice(-8);

    setGeneratedCreds({ username, password });
    setShowCredentials(true);

    setTimeout(() => {
      navigate("/login");
    }, 4000);
  };

  /* ===============================
     UI
  ================================= */
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow"
      >
        {/* HEADER */}
        <h2 className="text-center font-bold text-lg border-b pb-2">
          CLIENT REGISTRATION FORM
        </h2>

        <div className="flex justify-between text-sm mt-1">
          <span className="italic text-gray-600">
            G.N No. 47 (contd.)
          </span>
          <span className="font-bold">TUF. 15</span>
        </div>

        <p className="text-gray-500 text-sm mt-2">
          1% (This rate is statutory and auto-applied)
        </p>

        {/* INPUTS */}
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <input
            name="fullName"
            placeholder="Full Name"
            onChange={handleChange}
            required
            className="border p-2 rounded w-full"
          />
          <input
            name="phone"
            placeholder="Phone Number"
            onChange={handleChange}
            required
            className="border p-2 rounded w-full"
          />
          <input
            name="address"
            placeholder="Address"
            onChange={handleChange}
            required
            className="border p-2 rounded w-full md:col-span-2"
          />
        </div>

        {/* SIGNATURE BLOCK */}
        <div className="mt-8 space-y-6">
          {["client", "employee", "witness"].map((role) => (
            <div key={role}>
              <p className="font-medium capitalize">
                {role} Signature
              </p>
              <div
                onClick={() => setActiveSignature(role)}
                className="border-b border-black h-16 flex items-end justify-center cursor-pointer"
              >
                {signatures[role] ? (
                  <img
                    src={signatures[role]}
                    alt="signature"
                    className="h-12 object-contain"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">
                    Tap to Sign
                  </span>
                )}
              </div>

              <div className="mt-2">
                <label className="text-sm">Date</label>
                <input
                  type="date"
                  name={`date${role.charAt(0).toUpperCase() + role.slice(1)}`}
                  onChange={handleChange}
                  required
                  className="border-b border-black w-40 ml-2 outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* AGREEMENT */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowAgreement(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Review Agreement & Submit
          </button>
        </div>
      </form>

      {/* SIGNATURE MODAL */}
      {activeSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded-lg w-full max-w-lg">
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerUp={endDrawing}
              onPointerMove={draw}
              className="border w-full touch-none"
            />
            <div className="flex justify-between mt-3">
              <button
                onClick={() => ctxRef.current.clearRect(0, 0, 500, 200)}
                className="text-red-600"
              >
                Clear
              </button>
              <button
                onClick={saveSignature}
                className="bg-green-600 text-white px-4 py-1 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AGREEMENT MODAL */}
      {showAgreement && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded max-w-lg">
            <p className="mb-3">
              1. Client agrees to comply with all statutory regulations.
            </p>
            <p className="mb-3">
              2. Client acknowledges applicable tax obligations.
            </p>
            <p className="mb-3">
              3. Client confirms information provided is accurate.
            </p>
            <button
              onClick={() => {
                setShowAgreement(false);
                document.querySelector("form").requestSubmit();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Agree & Submit
            </button>
          </div>
        </div>
      )}

      {/* CREDENTIALS POPUP */}
      {showCredentials && generatedCreds && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded max-w-md text-center">
            <h3 className="font-bold mb-3">Account Created</h3>
            <p>Username: {generatedCreds.username}</p>
            <p>Password: {generatedCreds.password}</p>
            <p className="text-sm mt-3 text-gray-500">
              Redirecting to login...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
