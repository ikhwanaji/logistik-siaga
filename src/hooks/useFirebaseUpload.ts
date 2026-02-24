"use client";

import { useState, useCallback } from "react";

interface UploadState {
  progress:    number;
  isUploading: boolean;
  downloadUrl: string | null;
  error:       string | null;
}

interface UseImageUploadReturn extends UploadState {
  upload: (file: File) => Promise<string | null>;
  reset:  () => void;
}

export function useFirebaseUpload(): UseImageUploadReturn {
  const [state, setState] = useState<UploadState>({
    progress:    0,
    isUploading: false,
    downloadUrl: null,
    error:       null,
  });

  const upload = useCallback(async (file: File): Promise<string | null> => {
    // Validasi dasar
    if (!file.type.startsWith("image/")) {
      setState(s => ({ ...s, error: "Hanya file gambar yang diizinkan." }));
      return null;
    }

    setState({ progress: 0, isUploading: true, downloadUrl: null, error: null });

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset    = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET;

    if (!cloudName || !preset) {
      console.error("Cloudinary config missing!");
      setState(s => ({ ...s, isUploading: false, error: "Konfigurasi server error." }));
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);

    try {
      // Gunakan XMLHttpRequest agar bisa tracking progress (fetch biasa tidak bisa track progress upload)
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setState(s => ({ ...s, progress: pct }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            const url = data.secure_url; // URL gambar HTTPS dari Cloudinary
            setState({ progress: 100, isUploading: false, downloadUrl: url, error: null });
            resolve(url);
          } else {
            setState(s => ({ ...s, isUploading: false, error: "Gagal upload ke Cloudinary." }));
            resolve(null);
          }
        };

        xhr.onerror = () => {
          setState(s => ({ ...s, isUploading: false, error: "Koneksi error." }));
          resolve(null);
        };

        xhr.send(formData);
      });
    } catch (e) {
      setState(s => ({ ...s, isUploading: false, error: "Terjadi kesalahan sistem." }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ progress: 0, isUploading: false, downloadUrl: null, error: null });
  }, []);

  return { ...state, upload, reset };
}