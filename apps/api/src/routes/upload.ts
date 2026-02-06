import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { env } from '../env';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Check if Cloudinary is configured
const useCloudinary = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

// Configure Cloudinary if credentials are available
if (useCloudinary) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  console.log('[upload] Cloudinary configured - using cloud storage');
} else {
  console.log('[upload] Cloudinary not configured - using local storage');
}

// Local uploads directory (at project root level)
const UPLOADS_DIR = join(__dirname, '../../../../uploads');
const UPLOADS_URL = `${env.BETTER_AUTH_URL}/uploads`;

// Ensure uploads directories exist (for local storage fallback)
async function ensureUploadsDir() {
  if (useCloudinary) return; // Skip if using Cloudinary

  const dirs = [
    UPLOADS_DIR,
    join(UPLOADS_DIR, 'profiles'),
    join(UPLOADS_DIR, 'routes'),
    join(UPLOADS_DIR, 'users'),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

// Initialize directories
ensureUploadsDir();

const app = new Hono();

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Generate a unique filename
 */
function generateFilename(originalName: string): string {
  const ext = extname(originalName) || '.jpg';
  const uuid = randomUUID();
  const timestamp = Date.now();
  return `${timestamp}-${uuid}${ext}`;
}

/**
 * Upload file to Cloudinary
 */
async function uploadToCloudinary(file: File, folder: string): Promise<{ url: string; publicId: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const dataUri = `data:${file.type};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `climbtracker/${folder}`,
    resource_type: 'image',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

/**
 * Save a file to the local uploads directory
 */
async function saveFileLocally(file: File, subfolder: string): Promise<string> {
  const filename = generateFilename(file.name);
  const filepath = join(UPLOADS_DIR, subfolder, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return `${UPLOADS_URL}/${subfolder}/${filename}`;
}

/**
 * Save a file (Cloudinary or local based on configuration)
 */
async function saveFile(file: File, subfolder: string): Promise<{ url: string; publicId?: string }> {
  if (useCloudinary) {
    return uploadToCloudinary(file, subfolder);
  } else {
    const url = await saveFileLocally(file, subfolder);
    return { url };
  }
}

// POST /api/upload/profile-photo - Upload a single profile photo
app.post('/profile-photo', requireAuth, async (c) => {
  console.log('[upload] Profile photo upload request received');
  try {
    const formData = await c.req.formData();
    const file = formData.get('photo') as File | null;

    console.log('[upload] File received:', file ? `${file.name} (${file.size} bytes, ${file.type})` : 'null');

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File too large. Maximum size is 10MB' }, 400);
    }

    console.log('[upload] Starting file upload to', useCloudinary ? 'Cloudinary' : 'local storage');
    const result = await saveFile(file, 'profiles');

    console.log(`[upload] Profile photo uploaded successfully: ${result.url}`);

    return c.json({ success: true, url: result.url, publicId: result.publicId });
  } catch (error: any) {
    console.error('[upload] Profile photo error:', error);
    return c.json({ error: error.message || 'Upload failed' }, 500);
  }
});

// POST /api/upload/route-photo - Upload a single route photo
app.post('/route-photo', requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File too large. Maximum size is 10MB' }, 400);
    }

    const result = await saveFile(file, 'routes');

    console.log(`[upload] Route photo uploaded: ${result.url}`);

    return c.json({ success: true, url: result.url, publicId: result.publicId });
  } catch (error: any) {
    console.error('[upload] Route photo error:', error);
    return c.json({ error: error.message || 'Upload failed' }, 500);
  }
});

// POST /api/upload/user-photos - Upload multiple user photos
app.post('/user-photos', requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }

    const results: { url: string; publicId?: string }[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return c.json({ error: `Invalid file type for ${file.name}. Allowed: JPG, PNG, GIF, WebP` }, 400);
      }

      if (file.size > MAX_FILE_SIZE) {
        return c.json({ error: `File ${file.name} too large. Maximum size is 10MB` }, 400);
      }

      const result = await saveFile(file, 'users');
      results.push(result);
    }

    console.log(`[upload] ${results.length} user photos uploaded`);

    return c.json({
      success: true,
      urls: results.map(r => r.url),
      publicIds: results.map(r => r.publicId).filter(Boolean),
    });
  } catch (error: any) {
    console.error('[upload] User photos error:', error);
    return c.json({ error: error.message || 'Upload failed' }, 500);
  }
});

// DELETE /api/upload/photo - Delete a photo
app.delete('/photo', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { publicId, url } = body;

    if (useCloudinary && publicId) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(publicId);
      console.log(`[upload] Cloudinary file deleted: ${publicId}`);
      return c.json({ success: true });
    }

    // Local file deletion
    let filepath: string;

    if (url && url.includes('/uploads/')) {
      // Extract path from URL
      const urlPath = url.split('/uploads/')[1];
      filepath = join(UPLOADS_DIR, urlPath);
    } else if (publicId) {
      // Assume publicId is the relative path
      filepath = join(UPLOADS_DIR, publicId);
    } else {
      return c.json({ error: 'No publicId or url provided' }, 400);
    }

    // Security check: ensure path is within uploads dir
    if (!filepath.startsWith(UPLOADS_DIR)) {
      return c.json({ error: 'Invalid file path' }, 400);
    }

    if (existsSync(filepath)) {
      await unlink(filepath);
      console.log(`[upload] Local file deleted: ${filepath}`);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[upload] Delete error:', error);
    return c.json({ error: error.message || 'Delete failed' }, 500);
  }
});

// GET /api/upload/info - Get upload server info
app.get('/info', (c) => {
  return c.json({
    success: true,
    data: {
      provider: useCloudinary ? 'cloudinary' : 'local',
      cloudName: useCloudinary ? env.CLOUDINARY_CLOUD_NAME : null,
      uploadsDir: useCloudinary ? null : UPLOADS_DIR,
      uploadsUrl: useCloudinary ? null : UPLOADS_URL,
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_TYPES,
    },
  });
});

export default app;
