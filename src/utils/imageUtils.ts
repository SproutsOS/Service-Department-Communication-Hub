/**
 * Image processing utilities for client-side compression and camera capture.
 * Automatically resizes and compresses smartphone/tablet photos down to ~80KB-250KB
 * in high clarity before uploading to state and Firestore.
 */

export interface ProcessedVehiclePhoto {
  id: string;
  dataUrl: string;
  thumbnailUrl: string;
  caption: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName: string;
  fileSizeBytes: number;
}

/**
 * Resizes an image file and converts to optimized JPEG base64 DataURL.
 * Max dimension: 1600px for full photo (sharp and clear for VINs, scratches, tire wear),
 * quality: 0.78 JPEG compression.
 * Also generates a small thumbnail (320px) for fast card previews.
 */
export async function processAndCompressImageFile(
  file: File,
  uploader: { id: string; name: string },
  caption?: string
): Promise<ProcessedVehiclePhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        try {
          // 1. Process Main Image (Max 1600px dimension)
          const MAX_DIM = 1600;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context unavailable');
          }

          // Draw and compress to JPEG 0.78 quality
          ctx.drawImage(img, 0, 0, width, height);
          const fullDataUrl = canvas.toDataURL('image/jpeg', 0.78);

          // 2. Process Fast Thumbnail (Max 320px dimension)
          const THUMB_DIM = 320;
          let thumbW = width;
          let thumbH = height;
          if (thumbW > THUMB_DIM || thumbH > THUMB_DIM) {
            if (thumbW > thumbH) {
              thumbH = Math.round((thumbH * THUMB_DIM) / thumbW);
              thumbW = THUMB_DIM;
            } else {
              thumbW = Math.round((thumbW * THUMB_DIM) / thumbH);
              thumbH = THUMB_DIM;
            }
          }

          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbW;
          thumbCanvas.height = thumbH;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);
          }
          const thumbDataUrl = thumbCtx ? thumbCanvas.toDataURL('image/jpeg', 0.70) : fullDataUrl;

          // Calculate approximate byte size of base64
          const fileSizeBytes = Math.round((fullDataUrl.length * 3) / 4);

          const result: ProcessedVehiclePhoto = {
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            dataUrl: fullDataUrl,
            thumbnailUrl: thumbDataUrl,
            caption: (caption || '').trim(),
            uploadedAt: new Date().toISOString(),
            uploadedBy: uploader.id,
            uploadedByName: uploader.name,
            fileSizeBytes
          };

          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format raw byte size to human readable KB / MB
 */
export function formatImageSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
