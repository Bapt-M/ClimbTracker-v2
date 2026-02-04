const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Upload a single profile photo
 * @param file - Image file to upload
 * @returns Cloudinary URL of the uploaded image
 */
export const uploadProfilePhoto = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${API_URL}/api/upload/profile-photo`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  const data = await response.json();
  return data.url;
};

/**
 * Upload multiple user photos
 * @param files - Array of image files to upload
 * @returns Array of Cloudinary URLs
 */
export const uploadUserPhotos = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));

  const response = await fetch(`${API_URL}/api/upload/user-photos`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  const data = await response.json();
  return data.urls;
};

/**
 * Upload a single route photo
 * @param file - Image file to upload
 * @returns Cloudinary URL of the uploaded image
 */
export const uploadRoutePhoto = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${API_URL}/api/upload/route-photo`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  const data = await response.json();
  return data.url;
};

/**
 * Delete a photo from Cloudinary
 * @param publicId - Cloudinary public ID of the image
 */
export const deletePhoto = async (publicId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/upload/photo`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ publicId }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(error.error || 'Delete failed');
  }
};
