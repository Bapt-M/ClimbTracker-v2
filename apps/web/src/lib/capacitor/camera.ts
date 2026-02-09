import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { isNative, isPluginAvailable } from './platform';

export interface CapturedImage {
  dataUrl: string;
  format: string;
  path?: string;
  webPath?: string;
}

/**
 * Capture a photo using native camera or file input fallback
 */
export async function capturePhoto(options?: {
  quality?: number;
  allowEditing?: boolean;
  promptLabelHeader?: string;
}): Promise<CapturedImage | null> {
  const {
    quality = 90,
    allowEditing = false,
    promptLabelHeader = 'Photo',
  } = options || {};

  // Try native camera if available
  if (isNative() && isPluginAvailable('Camera')) {
    try {
      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // Let user choose camera or gallery
        promptLabelHeader,
        promptLabelPhoto: 'Galerie',
        promptLabelPicture: 'Camera',
        saveToGallery: false,
      });

      if (!photo.dataUrl) {
        return null;
      }

      return {
        dataUrl: photo.dataUrl,
        format: photo.format,
        path: photo.path,
        webPath: photo.webPath,
      };
    } catch (error) {
      // User cancelled or error
      console.log('[camera] Native camera cancelled or error:', error);
      return null;
    }
  }

  // Web fallback - use file input
  return capturePhotoWeb();
}

/**
 * Capture from camera only (no gallery option)
 */
export async function captureFromCamera(options?: {
  quality?: number;
  allowEditing?: boolean;
}): Promise<CapturedImage | null> {
  const { quality = 90, allowEditing = false } = options || {};

  if (isNative() && isPluginAvailable('Camera')) {
    try {
      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
      });

      if (!photo.dataUrl) {
        return null;
      }

      return {
        dataUrl: photo.dataUrl,
        format: photo.format,
        path: photo.path,
        webPath: photo.webPath,
      };
    } catch (error) {
      console.log('[camera] Camera capture cancelled or error:', error);
      return null;
    }
  }

  // Web fallback with camera constraint
  return capturePhotoWeb({ cameraOnly: true });
}

/**
 * Pick from gallery only
 */
export async function pickFromGallery(options?: {
  quality?: number;
  allowEditing?: boolean;
}): Promise<CapturedImage | null> {
  const { quality = 90, allowEditing = false } = options || {};

  if (isNative() && isPluginAvailable('Camera')) {
    try {
      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        saveToGallery: false,
      });

      if (!photo.dataUrl) {
        return null;
      }

      return {
        dataUrl: photo.dataUrl,
        format: photo.format,
        path: photo.path,
        webPath: photo.webPath,
      };
    } catch (error) {
      console.log('[camera] Gallery pick cancelled or error:', error);
      return null;
    }
  }

  // Web fallback
  return capturePhotoWeb({ cameraOnly: false });
}

/**
 * Web fallback using file input
 */
function capturePhotoWeb(options?: { cameraOnly?: boolean }): Promise<CapturedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    if (options?.cameraOnly) {
      input.capture = 'environment'; // Use back camera on mobile
    }

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        const format = file.type.split('/')[1] || 'jpeg';

        resolve({
          dataUrl,
          format,
        });
      } catch (error) {
        console.error('[camera] Failed to read file:', error);
        resolve(null);
      }
    };

    input.oncancel = () => {
      resolve(null);
    };

    // Trigger file picker
    input.click();
  });
}

/**
 * Convert file to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert data URL to Blob for upload
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Check camera permissions
 */
export async function checkCameraPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNative() || !isPluginAvailable('Camera')) {
    // Web always grants (browser handles permissions)
    return 'granted';
  }

  try {
    const status = await Camera.checkPermissions();
    return status.camera;
  } catch {
    return 'prompt';
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNative() || !isPluginAvailable('Camera')) {
    return 'granted';
  }

  try {
    const status = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    return status.camera;
  } catch {
    return 'denied';
  }
}
