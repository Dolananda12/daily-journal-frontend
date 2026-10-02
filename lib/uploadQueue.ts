import { apiFetch } from './apiClient';
import { processImageForUpload, ProcessedImage } from './imageProcessing';

export interface UploadItem {
  id: string; // client temporary ID
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'uploading' | 'completed' | 'duplicate' | 'error';
  progress: number; // 0 to 100
  error?: string;
  serverImageId?: string;
}

export interface UploadCallbacks {
  onItemUpdated: (item: UploadItem) => void;
  onItemCompleted: (item: UploadItem, serverImage?: any) => void;
  onAllCompleted: () => void;
}

/**
 * Direct upload helper that puts binary blob to Supabase Storage signed upload URL.
 */
async function uploadBlobToSignedUrl(
  signedUrl: string,
  blob: Blob,
  contentType: string = 'image/webp'
): Promise<void> {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Storage upload failed (${res.status}): ${errorText}`);
  }
}

/**
 * Fallback direct multipart upload to Spring Boot backend.
 */
async function uploadViaBackendFallback(
  processed: ProcessedImage,
  originalFileName: string
): Promise<any> {
  const formData = new FormData();
  formData.append('file', processed.displayBlob, `${originalFileName}.webp`);
  formData.append('thumb', processed.thumbBlob, `${originalFileName}_t.webp`);
  formData.append('width', String(processed.displayWidth));
  formData.append('height', String(processed.displayHeight));
  formData.append('checksum', processed.checksumSha256);
  formData.append('takenAt', processed.takenAt);

  const res = await apiFetch('/api/images/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Upload failed');
    throw new Error(`Server upload failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Manages uploading files with concurrency control, sequential client-side compression,
 * signed storage URL upload with automatic multipart fallback.
 */
export async function processAndUploadBatch(
  files: File[],
  callbacks: UploadCallbacks
): Promise<void> {
  if (files.length === 0) return;

  // Max 20 files per batch
  const selectedFiles = files.slice(0, 20);

  // Initialise items for UI
  const items: UploadItem[] = selectedFiles.map((f) => ({
    id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    file: f,
    previewUrl: URL.createObjectURL(f),
    status: 'pending',
    progress: 0,
  }));

  items.forEach((item) => callbacks.onItemUpdated(item));

  // 1. Process files sequentially to conserve mobile/browser memory
  const processedMap = new Map<string, { item: UploadItem; processed: ProcessedImage }>();

  for (const item of items) {
    try {
      item.status = 'processing';
      item.progress = 15;
      callbacks.onItemUpdated(item);

      const processed = await processImageForUpload(item.file);
      processedMap.set(item.id, { item, processed });

      item.progress = 30;
      callbacks.onItemUpdated(item);
    } catch (err: any) {
      console.error('Error processing image:', item.file.name, err);
      item.status = 'error';
      item.error = err?.message || 'Failed to process image';
      callbacks.onItemUpdated(item);
    }
  }

  // 2. Prepare upload intents
  const validEntries = Array.from(processedMap.values());
  if (validEntries.length === 0) {
    callbacks.onAllCompleted();
    return;
  }

  const intentRequests = validEntries.map(({ item, processed }) => ({
    clientId: item.id,
    fileName: item.file.name,
    mime: 'image/webp',
    width: processed.displayWidth,
    height: processed.displayHeight,
    sizeBytes: processed.displaySizeBytes,
    checksum: processed.checksumSha256,
    takenAt: processed.takenAt,
    blurhash: processed.blurhash,
  }));

  let intentResponses: any[] = [];
  try {
    const res = await apiFetch('/api/images/upload-intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intentRequests),
    });

    if (res.ok) {
      intentResponses = await res.json();
    }
  } catch (err) {
    console.warn('Upload intents failed, falling back to direct server upload:', err);
  }

  // 3. Upload files with concurrency limit = 3
  const CONCURRENCY = 3;
  let activeIndex = 0;

  async function uploadWorker(): Promise<void> {
    while (activeIndex < validEntries.length) {
      const index = activeIndex++;
      const { item, processed } = validEntries[index];
      const intent = intentResponses.find((i) => i.clientId === item.id);

      // Check if server flagged duplicate
      if (intent?.duplicate) {
        item.status = 'duplicate';
        item.progress = 100;
        item.serverImageId = intent.imageId;
        callbacks.onItemUpdated(item);
        callbacks.onItemCompleted(item, intent.existingImage);
        continue;
      }

      item.status = 'uploading';
      item.progress = 45;
      callbacks.onItemUpdated(item);

      try {
        let completedImage = null;

        // Try direct signed URL upload if available
        if (intent?.displayUploadUrl && intent?.thumbUploadUrl) {
          try {
            await Promise.all([
              uploadBlobToSignedUrl(intent.displayUploadUrl, processed.displayBlob, 'image/webp'),
              uploadBlobToSignedUrl(intent.thumbUploadUrl, processed.thumbBlob, 'image/webp'),
            ]);

            item.progress = 85;
            callbacks.onItemUpdated(item);

            const completeRes = await apiFetch(`/api/images/${intent.imageId}/complete`, {
              method: 'POST',
            });

            if (completeRes.ok) {
              completedImage = await completeRes.json();
            }
          } catch (storageErr) {
            console.warn('Signed upload failed, falling back to direct backend upload:', storageErr);
          }
        }

        // Fallback to direct backend upload if signed upload wasn't used or failed
        if (!completedImage) {
          completedImage = await uploadViaBackendFallback(processed, item.file.name);
        }

        item.status = 'completed';
        item.progress = 100;
        item.serverImageId = completedImage?.id;
        callbacks.onItemUpdated(item);
        callbacks.onItemCompleted(item, completedImage);
      } catch (err: any) {
        console.error('Upload failed for item:', item.file.name, err);
        item.status = 'error';
        item.error = err?.message || 'Upload failed';
        callbacks.onItemUpdated(item);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, validEntries.length) }, () =>
    uploadWorker()
  );

  await Promise.all(workers);
  callbacks.onAllCompleted();
}
