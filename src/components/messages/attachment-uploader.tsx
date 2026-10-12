'use client';

import React, { useRef, useState } from 'react';
import { Paperclip, X, Loader2 } from 'lucide-react';

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(url) || url.includes('/image/upload/');
}

export function AttachmentUploader(props: {
  attachmentUrl: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    if (!cloudName || !preset) {
      alert('Cloudinary env missing (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET). Redeploy required.');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Upload failed');

      props.onUploaded(data.secure_url);
    } catch (e: any) {
      alert(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.currentTarget.value = '';
        }}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      />

      {props.attachmentUrl ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 px-2 py-1">
          {isImageUrl(props.attachmentUrl) ? (
            <img src={props.attachmentUrl} className="h-8 w-8 rounded object-cover" alt="attachment" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          <a className="text-xs underline max-w-[160px] truncate" href={props.attachmentUrl} target="_blank" rel="noreferrer">
            Attachment ready
          </a>
          <button type="button" onClick={props.onClear} className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs flex items-center gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          Attach
        </button>
      )}
    </div>
  );
}
