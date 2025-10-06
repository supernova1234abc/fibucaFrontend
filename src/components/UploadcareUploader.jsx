import React from 'react'
import { FileUploaderRegular } from '@uploadcare/react-uploader'
import '@uploadcare/react-uploader/core.css'

export default function UploadcareUploader({ onUploaded }) {
  const handleUpload = (e) => {
    const file = e?.detail?.fileInfo
    if (file?.cdnUrl) {
      console.log('✅ Uploaded to Uploadcare:', file.cdnUrl)
      onUploaded(file.cdnUrl)
    }
  }

  return (
    <div className="border p-3 rounded bg-gray-50">
      <label className="block text-sm font-semibold mb-2 text-gray-700">
        Upload or Capture Photo
      </label>
      <FileUploaderRegular
        pubkey="42db570f1392dabdf82b"   // your Uploadcare public key
        sourceList="local, camera"
        multiple={false}
        imageShrink="600x600"           // resize before upload
        classNameUploader="uc-light"
        onChange={handleUpload}
      />
    </div>
  )
}
