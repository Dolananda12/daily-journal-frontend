import exifr from 'exifr';
import { encode } from 'blurhash';

export interface ProcessedImage {
  displayBlob: Blob;
  displayWidth: number;
  displayHeight: number;
  displaySizeBytes: number;
  thumbBlob: Blob;
  thumbWidth: number;
  thumbHeight: number;
  thumbSizeBytes: number;
  checksumSha256: string;
  takenAt: string; // ISO string
  blurhash: string;
}

/**
 * Converts HEIC/HEIF files to JPEG using dynamic import of heic2any
 * so SSR / bundling doesn't break if window is undefined.
 */
export async function convertHeicIfNeeded(file: File): Promise<Blob | File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (!isHeic) return file;

  try {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    return Array.isArray(converted) ? converted[0] : converted;
  } catch (err) {
    console.warn('HEIC conversion failed, using original file:', err);
    return file;
  }
}

/**
 * Extracts EXIF date (DateTimeOriginal / CreateDate) and falls back to lastModified or now.
 */
export async function extractTakenAt(file: File | Blob): Promise<string> {
  try {
    if (file instanceof File) {
      const parsed = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'ModifyDate']);
      const date = parsed?.DateTimeOriginal || parsed?.CreateDate || parsed?.ModifyDate;
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
      if (file.lastModified) {
        return new Date(file.lastModified).toISOString();
      }
    }
  } catch (e) {
    console.debug('EXIF extraction skipped or failed:', e);
  }
  return new Date().toISOString();
}

/**
 * Computes SHA-256 checksum of a Blob/File.
 */
export async function computeSha256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Loads an image from a Blob into an HTMLImageElement.
 */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Renders an image to a canvas with target max dimension and returns the canvas & resized dimensions.
 */
function resizeToCanvas(
  img: HTMLImageElement,
  maxDimension: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  let { naturalWidth: width, naturalHeight: height } = img;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
  }
  return { canvas, width, height };
}

/**
 * Converts canvas to WebP or fallback to JPEG Blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to JPEG if WebP export is unsupported
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve(jpegBlob);
              else reject(new Error('Canvas export failed'));
            },
            'image/jpeg',
            quality
          );
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Computes a lightweight BlurHash placeholder from a canvas.
 */
function computeBlurHashFromImage(img: HTMLImageElement): string {
  try {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, 32, 32);
    const imageData = ctx.getImageData(0, 0, 32, 32);
    return encode(imageData.data, 32, 32, 4, 3);
  } catch (err) {
    console.debug('BlurHash generation skipped:', err);
    return '';
  }
}

/**
 * Prepares an image for upload:
 * - Converts HEIC if needed
 * - Reads EXIF taken_at
 * - Computes original SHA-256 for duplicate detection
 * - Generates display WebP (max 2560px, quality 0.82)
 * - Generates thumb WebP (max 480px, quality 0.75)
 * - Generates BlurHash
 */
export async function processImageForUpload(file: File): Promise<ProcessedImage> {
  // 1. Convert HEIC if needed
  const convertedBlob = await convertHeicIfNeeded(file);

  // 2. EXIF timestamp
  const takenAt = await extractTakenAt(file);

  // 3. SHA-256 checksum of original converted blob
  const checksumSha256 = await computeSha256(convertedBlob);

  // 4. Load into Image element
  const img = await loadImage(convertedBlob);

  // 5. BlurHash
  const blurhash = computeBlurHashFromImage(img);

  // 6. Display version (max 2560px, q=0.82)
  const displayRes = resizeToCanvas(img, 2560);
  const displayBlob = await canvasToBlob(displayRes.canvas, 0.82);

  // 7. Thumb version (max 480px, q=0.75)
  const thumbRes = resizeToCanvas(img, 480);
  const thumbBlob = await canvasToBlob(thumbRes.canvas, 0.75);

  return {
    displayBlob,
    displayWidth: displayRes.width,
    displayHeight: displayRes.height,
    displaySizeBytes: displayBlob.size,
    thumbBlob,
    thumbWidth: thumbRes.width,
    thumbHeight: thumbRes.height,
    thumbSizeBytes: thumbBlob.size,
    checksumSha256,
    takenAt,
    blurhash,
  };
}
