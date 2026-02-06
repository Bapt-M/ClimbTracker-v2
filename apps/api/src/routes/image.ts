import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const app = new Hono();

// GET /api/image/proxy - Proxy an image to bypass CORS
app.get('/proxy', requireAuth, async (c) => {
  const url = c.req.query('url');

  if (!url) {
    return c.json({ error: 'URL parameter is required' }, 400);
  }

  try {
    // Validate URL
    const parsedUrl = new URL(url);

    // Only allow certain protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return c.json({ error: 'Invalid URL protocol' }, 400);
    }

    // Fetch the image
    const response = await fetch(url);

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch image' }, response.status);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      return c.json({ error: 'URL does not point to an image' }, 400);
    }

    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return c.json({ error: 'Failed to proxy image' }, 500);
  }
});

export default app;
