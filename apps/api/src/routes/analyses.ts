import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, extname } from 'path';
import { Hono } from 'hono';
import { db } from '../lib/auth';
import { videos, analyses, routes } from '@climbtracker/database/schema';
import { requireAuth } from '../middleware/auth';
import { eq, desc, inArray } from 'drizzle-orm';
import { env } from '../env';
import { v2 as cloudinary } from 'cloudinary';
import {
  analyzeVideoWithGemini,
  aggregateScores,
} from '../services/video-analysis.service';

const app = new Hono();

// Check if Cloudinary is configured for video uploads
const useCloudinary = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// POST /api/ai/analyze-video
app.post('/analyze-video', requireAuth, async (c) => {
  const user = c.get('user');

  if (!env.GOOGLE_API_KEY) {
    return c.json({ success: false, error: 'AI analysis not configured' }, 503);
  }

  if (!useCloudinary) {
    return c.json({
      success: false,
      error: 'Video analysis requires Cloudinary to be configured.',
    }, 503);
  }

  try {
    const formData = await c.req.formData();
    const videoFile = formData.get('video') as File | null;
    const routeId = formData.get('routeId') as string | null;

    if (!videoFile) {
      return c.json({ success: false, error: 'No video file provided' }, 400);
    }

    if (!routeId) {
      return c.json({ success: false, error: 'routeId is required' }, 400);
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(videoFile.type)) {
      return c.json({ success: false, error: 'Invalid video format. Use MP4, MOV or WebM.' }, 400);
    }

    // Max 100MB
    if (videoFile.size > 100 * 1024 * 1024) {
      return c.json({ success: false, error: 'Video too large (max 100MB).' }, 400);
    }

    // Load route
    const route = await db.query.routes.findFirst({
      where: eq(routes.id, routeId),
      columns: { id: true, name: true },
    });

    if (!route) {
      return c.json({ success: false, error: 'Route not found' }, 404);
    }

    // Write video to temp file — shared by Cloudinary upload and Gemini File API
    const ext = extname(videoFile.name || '.mp4') || '.mp4';
    const tmpPath = join(tmpdir(), `climbtracker_${crypto.randomUUID()}${ext}`);
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    writeFileSync(tmpPath, buffer);

    // Use definite assignment (!) — TypeScript cannot prove assignment through try/finally,
    // but if these are unset the outer catch returns a 500 before they are used.
    let videoUrl!: string;
    let thumbnailUrl!: string;
    let claudeResult!: Awaited<ReturnType<typeof analyzeVideoWithGemini>>;

    try {
      const result = await cloudinary.uploader.upload(tmpPath, {
        folder: 'climbtracker/videos',
        resource_type: 'video',
        eager: [{ format: 'jpg', transformation: [{ width: 400 }] }],
        eager_async: true,
      });
      videoUrl = result.secure_url;
      thumbnailUrl = result.secure_url
        .replace(/\.[^.]+$/, '.jpg')
        .replace('/video/upload/', '/video/upload/so_10p/');

      claudeResult = await analyzeVideoWithGemini(tmpPath, videoFile.type, route.name);
    } finally {
      try { unlinkSync(tmpPath); } catch {}
    }

    const scores = aggregateScores(claudeResult);

    // Create video record
    const videoId = crypto.randomUUID();
    await db.insert(videos).values({
      id: videoId,
      url: videoUrl,
      thumbnailUrl: thumbnailUrl || videoUrl,
      userId: user.id,
      routeId,
    });

    // Store analysis
    const analysisId = crypto.randomUUID();
    await db.insert(analyses).values({
      id: analysisId,
      videoId,
      routeId,
      poseData: {},
      globalScore: scores.global,
      detailScores: {
        fluidite: scores.fluidite,
        technique: scores.technique,
        precision: scores.precision,
        endurance: scores.endurance,
        creativite: scores.creativite,
      },
      suggestions: claudeResult.suggestions,
      highlights: claudeResult.highlights,
    });

    return c.json({
      success: true,
      data: {
        analysisId,
        globalScore: scores.global,
        detailScores: {
          fluidite: scores.fluidite,
          technique: scores.technique,
          precision: scores.precision,
          endurance: scores.endurance,
          creativite: scores.creativite,
        },
      },
    }, 201);
  } catch (error: any) {
    console.error('[analyses] analyze-video error:', error);
    return c.json({ success: false, error: error.message || 'Analysis failed' }, 500);
  }
});

// GET /api/analysis/route/:routeId  (must come BEFORE /:id wildcard)
app.get('/route/:routeId', requireAuth, async (c) => {
  const routeId = c.req.param('routeId');

  const routeAnalyses = await db.query.analyses.findMany({
    where: eq(analyses.routeId, routeId),
    with: {
      video: { columns: { id: true, thumbnailUrl: true, uploadedAt: true } },
    },
    orderBy: [desc(analyses.createdAt)],
    limit: 20,
  });

  return c.json({ success: true, data: { analyses: routeAnalyses } });
});

// GET /api/analysis/user/:userId  (must come BEFORE /:id wildcard)
app.get('/user/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId');

  // First get video IDs for this user
  const userVideos = await db.query.videos.findMany({
    where: eq(videos.userId, userId),
    columns: { id: true },
    orderBy: [desc(videos.uploadedAt)],
    limit: 50,
  });

  if (userVideos.length === 0) {
    return c.json({ success: true, data: { analyses: [] } });
  }

  const videoIds = userVideos.map(v => v.id);

  const userAnalyses = await db.query.analyses.findMany({
    where: inArray(analyses.videoId, videoIds),
    with: {
      video: { columns: { id: true, thumbnailUrl: true, uploadedAt: true } },
      route: { columns: { id: true, name: true, difficulty: true, mainPhoto: true } },
    },
    orderBy: [desc(analyses.createdAt)],
  });

  return c.json({ success: true, data: { analyses: userAnalyses } });
});

// GET /api/analysis/:id  (wildcard — must be LAST)
app.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, id),
    with: {
      video: {
        columns: { id: true, url: true, thumbnailUrl: true, uploadedAt: true },
      },
      route: {
        columns: { id: true, name: true, difficulty: true, mainPhoto: true },
      },
    },
  });

  if (!analysis) {
    return c.json({ success: false, error: 'Analysis not found' }, 404);
  }

  return c.json({ success: true, data: { analysis } });
});

export default app;
