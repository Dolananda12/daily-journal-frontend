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
    throw new Error(`Upload to storage failed (${res.status}): ${errorText}`);
  }
}

/**
 * Manages uploading files with max concurrency of 3, sequential client-side compression,
 * and optimistic UI updates.
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

  // 1. Process files sequentially to conserve mobile memory
  const processedMap = new Map<string, { item: UploadItem; processed: ProcessedImage }>();

  for (const item of items) {
    try {
      item.status = 'processing';
      item.progress = 10;
      callbacks.onItemUpdated(item);

      const processed = await processImageForUpload(item.file);
      processedMap.set(item.id, { item, processed });

      item.progress = 25;
      callbacks.onItemUpdated(item);
    } catch (err: any) {
      item.status = 'error';
      item.error = err?.message || 'Failed to process image';
      callbacks.onItemUpdated(item);
    }
  }

  // 2. Prepare upload intents payload
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

    if (!res.ok) {
      throw new Error(`Server rejected upload intents (${res.status})`);
    }

    intentResponses = await res.json();
  } catch (err: any) {
    validEntries.forEach(({ item }) => {
      item.status = 'error';
      item.error = err?.message || 'Failed to create upload session';
      callbacks.onItemUpdated(item);
    });
    callbacks.onAllCompleted();
    return;
  }

  // 3. Upload files with concurrency limit = 3
  const CONCURRENCY = 3;
  let activeIndex = 0;

  async function uploadWorker(): Promise<void> {
    while (activeIndex < intentResponses.length) {
      const index = activeIndex++;
      const intent = intentResponses[index];
      const entry = validEntries.find((e) => e.item.id === intent.clientId);
      if (!entry) continue;

      const { item, processed } = entry;

      // Check if duplicate
      if (intent.duplicate) {
        item.status = 'duplicate';
        item.progress = 100;
        item.serverImageId = intent.imageId;
        callbacks.onItemUpdated(item);
        callbacks.onItemCompleted(item, intent.existingImage);
        continue;
      }

      try {
        item.status = 'uploading';
        item.progress = 30;
        callbacks.onItemUpdated(item);

        // Upload display and thumb in parallel to Supabase Storage signed URLs
        await Promise.all([
          uploadBlobToSignedUrl(intent.displayUploadUrl, processed.displayBlob, 'image/webp'),
          uploadBlobToSignedUrl(intent.thumbUploadUrl, processed.thumbBlob, 'image/webp'),
        ]);

        item.progress = 85;
        callbacks.onItemUpdated(item);

        // Call complete on backend
        const completeRes = await apiFetch(`/api/images/${intent.imageId}/complete`, {
          method: 'POST',
        });

        if (!completeRes.ok) {
          throw new Error('Backend failed to verify upload completion');
        }

        const completedImage = await completeRes.json();
        item.status = 'completed';
        item.progress = 100;
        item.serverImageId = intent.imageId;
        callbacks.onItemUpdated(item);
        callbacks.onItemCompleted(item, completedImage);
      } catch (err: any) {
        console.error('Upload error for item:', item.file.name, err);
        item.status = 'error';
        item.error = err?.message || 'Upload failed';
        callbacks.onItemUpdated(item);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, intentResponses.length) }, () =>
    uploadWorker()
  );

  await Promise.all(workers);
  callbacks.onAllCompleted();
}
