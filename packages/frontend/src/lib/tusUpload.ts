import * as tus from 'tus-js-client';

export interface TusUploadOptions {
  eventId: string;
  uploadedBy?: string;
  categoryId?: string;
  onProgress?: (percent: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Upload a file using Tus.io resumable upload protocol.
 * Supports auto-resume on connection failure.
 */
export async function uploadWithTus(
  file: File,
  options: TusUploadOptions
): Promise<string> {
  const { eventId, uploadedBy, categoryId, onProgress, onError } = options;

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: '/api/uploads',
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      metadata: {
        filename: file.name,
        filetype: file.type,
        eventId: eventId,
        uploadedBy: uploadedBy || '',
        categoryId: categoryId || '',
      },
      onError: (error) => {
        onError?.(error);
        reject(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = (bytesUploaded / bytesTotal) * 100;
        onProgress?.(percent);
      },
      onSuccess: () => {
        resolve(upload.url || '');
      },
    });

    // Check for previous uploads to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}

/**
 * Check if Tus uploads are enabled on the server.
 */
export async function isTusEnabled(): Promise<boolean> {
  try {
    const response = await fetch('/api/uploads/status');
    if (response.ok) {
      const data = await response.json();
      return data.enabled === true;
    }
    return false;
  } catch {
    return false;
  }
}
