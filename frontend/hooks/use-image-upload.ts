"use client";

import { useCallback, useState } from "react";

export type UploadedImage = {
  url: string;
  /** true while the file is being uploaded */
  uploading: boolean;
  /** local object-URL for instant preview before upload completes */
  preview: string;
  error?: string;
};

type UseImageUploadOptions = {
  /** Supabase Storage bucket name. Defaults to env var SUPABASE_STORAGE_BUCKET or "item-images". */
  bucket?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  /** Max file size in bytes. Defaults to 5 MB. */
  maxSizeBytes?: number;
};

/**
 * Shared image-upload hook.
 *
 * Uploads directly to Supabase Storage from the browser using the public
 * anon key.  Falls back gracefully when Supabase env vars are missing –
 * in that case it resolves to the object-URL so the form can still submit
 * a URL string (manual entry path).
 */
export function useImageUpload(
  initialUrls: string[] = [],
  options: UseImageUploadOptions = {},
) {
  const {
    maxFiles = 8,
    acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeBytes = 5 * 1024 * 1024, // 5 MB
  } = options;

  const [images, setImages] = useState<UploadedImage[]>(
    initialUrls.map((url) => ({ url, uploading: false, preview: url })),
  );

  const bucketName =
    options.bucket ??
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ??
    "item-images";

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        // No Supabase config — return the blob URL as-is.
        // Sellers can also paste a URL manually.
        return URL.createObjectURL(file);
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const res = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucketName}/${path}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": file.type,
            "x-upsert": "true",
          },
          body: file,
        },
      );

      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText);
        throw new Error(`Storage upload failed: ${msg}`);
      }

      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
    },
    [bucketName],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);

      const validFiles = incoming.filter((file) => {
        if (!acceptedTypes.includes(file.type)) return false;
        if (file.size > maxSizeBytes) return false;
        return true;
      });

      const slots = maxFiles - images.filter((img) => !img.error).length;
      const toUpload = validFiles.slice(0, Math.max(0, slots));

      // Create placeholder entries immediately for instant preview
      const placeholders: UploadedImage[] = toUpload.map((file) => ({
        url: "",
        uploading: true,
        preview: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...placeholders]);

      toUpload.forEach(async (file, idx) => {
        try {
          const url = await uploadFile(file);
          setImages((prev) => {
            const next = [...prev];
            // Find this placeholder (match by preview URL)
            const pos = next.findIndex(
              (img) => img.uploading && img.preview === placeholders[idx]?.preview,
            );
            if (pos !== -1) {
              next[pos] = { url, uploading: false, preview: url };
            }
            return next;
          });
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : "Upload failed";
          setImages((prev) => {
            const next = [...prev];
            const pos = next.findIndex(
              (img) => img.uploading && img.preview === placeholders[idx]?.preview,
            );
            if (pos !== -1) {
              next[pos] = {
                ...next[pos],
                uploading: false,
                error: errMsg,
              };
            }
            return next;
          });
        }
      });
    },
    [images, maxFiles, uploadFile, acceptedTypes, maxSizeBytes],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const img = prev[index];
      if (img?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(img.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const addManualUrl = useCallback((url: string) => {
    if (!url.trim()) return;
    setImages((prev) => [
      ...prev,
      { url: url.trim(), uploading: false, preview: url.trim() },
    ]);
  }, []);

  const urls = images
    .filter((img) => img.url && !img.uploading && !img.error)
    .map((img) => img.url);

  const isUploading = images.some((img) => img.uploading);

  return { images, addFiles, removeImage, addManualUrl, urls, isUploading };
}
