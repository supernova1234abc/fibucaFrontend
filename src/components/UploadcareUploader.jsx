import React, { useState } from "react";
import { FileUploaderRegular } from "@uploadcare/react-uploader";
import "@uploadcare/react-uploader/core.css";

export default function UploadcareUploader({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const handleUpload = (e) => {
    const file = e?.detail?.fileInfo;
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setStatusMsg("⏳ Starting upload...");

    // Monitor progress
    const uploadPromise = file.promise();

    // Uploadcare’s progress tracking
    uploadPromise.onProgress((info) => {
      const percent = Math.floor((info.progress || 0) * 100);
      setProgress(percent);
      setStatusMsg(`Uploading... ${percent}%`);
    });

    uploadPromise
      .then((info) => {
        console.log("✅ Uploaded to Uploadcare:", info.cdnUrl);
        setStatusMsg("✅ Upload complete!");
        setProgress(100);
        setUploading(false);
        onUploaded(info.cdnUrl);
      })
      .catch((err) => {
        console.error("❌ Upload failed:", err);
        setStatusMsg("❌ Upload failed. Try again.");
        setUploading(false);
        setProgress(0);
      });
  };

  return (
    <div className="border p-5 rounded-2xl bg-white shadow-sm w-full max-w-md mx-auto">
      <label className="block text-sm font-semibold mb-2 text-gray-700">
        Upload or Capture Photo
      </label>

      {/* Upload Widget */}
      <div
        className={`transition-opacity duration-300 ${
          uploading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <FileUploaderRegular
          pubkey="42db570f1392dabdf82b" // ✅ your Uploadcare public key
          sourceList="local, camera"
          multiple={false}
          imageShrink="600x600"
          classNameUploader="uc-light"
          onChange={handleUpload}
        />
      </div>

      {/* Progress UI */}
      {uploading && (
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <svg
              className="animate-spin h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <span className="text-sm text-gray-600">{statusMsg}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {!uploading && statusMsg && (
        <p
          className={`mt-3 text-sm font-medium text-center ${
            statusMsg.includes("✅")
              ? "text-green-600"
              : statusMsg.includes("❌")
              ? "text-red-600"
              : "text-gray-600"
          }`}
        >
          {statusMsg}
        </p>
      )}
    </div>
  );
}
