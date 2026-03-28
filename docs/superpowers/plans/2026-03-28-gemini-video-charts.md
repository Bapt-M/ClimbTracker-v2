# Gemini Video Analysis + MediaPipe Chart Axes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 5-frame Gemini analysis with full video upload via Gemini File API, and add proper X (video time) / Y (labeled scale) axes to the MediaPipe charts.

**Architecture:** Backend — refactor `video-analysis.service.ts` to use `GoogleAIFileManager` (upload → poll → generateContent → delete), then update the route's `tmpPath` lifecycle to cover both Cloudinary and Gemini calls. Frontend — add `videoTime: number` (seconds) to `PoseFrame`, propagate it atomically through `usePoseMetrics` → `PoseAnalysisPlayer` → `AnalysisResults`, then rewrite `PoseMetricsCharts` with SVG X/Y axes using video time.

**Tech Stack:** `@google/generative-ai` v0.24.x (server subpath for `GoogleAIFileManager`), Vitest, React SVG, TypeScript.

---

## File Map

| File | Action |
|------|--------|
| `apps/api/src/services/video-analysis.service.ts` | Modify — add `buildPrompt`, `parseAndValidate`, `analyzeVideoWithGemini`; remove `extractCloudinaryFrames`, `analyzeWithClaude` |
| `apps/api/src/services/video-analysis.service.test.ts` | Create — unit tests for pure helpers |
| `apps/api/src/routes/analyses.ts` | Modify — single `try/finally` for tmpPath, use `analyzeVideoWithGemini`, remove debug logs |
| `apps/web/src/hooks/usePoseMetrics.ts` | Modify — add `videoTime` to `PoseFrame`, update `addFrame` signature |
| `apps/web/src/components/PoseAnalysisPlayer.tsx` | Modify — pass `video.currentTime` as third arg to `onLandmarks` |
| `apps/web/src/pages/AnalysisResults.tsx` | Modify — update `handleLandmarks` to accept and forward `videoTime` |
| `apps/web/src/components/PoseMetricsCharts.tsx` | Modify — full axes rewrite: X = video time, Y = labeled scale |
| `apps/web/src/components/PoseMetricsCharts.test.ts` | Create — unit tests for `xOfTime`, `formatTime`, `polylinePoints` |

---

## Task 1 — Add new service helpers + analyzeVideoWithGemini

**Files:**
- Modify: `apps/api/src/services/video-analysis.service.ts`
- Create: `apps/api/src/services/video-analysis.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/services/video-analysis.service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPrompt, parseAndValidate } from './video-analysis.service';

describe('buildPrompt', () => {
  it('contains the route name', () => {
    const result = buildPrompt('Voie Test');
    expect(result).toContain('Voie Test');
  });

  it('asks for JSON output', () => {
    const result = buildPrompt('X');
    expect(result).toContain('JSON');
  });
});

describe('parseAndValidate', () => {
  const validJson = JSON.stringify({
    scores: { fluidite: 80, technique: 70, precision: 60, endurance: 50, creativite: 40 },
    suggestions: ['conseil 1'],
    highlights: ['point fort 1'],
  });

  it('parses valid JSON and returns scores', () => {
    const result = parseAndValidate(validJson);
    expect(result.scores.fluidite).toBe(80);
    expect(result.scores.technique).toBe(70);
  });

  it('clamps scores above 100 to 100', () => {
    const json = JSON.stringify({
      scores: { fluidite: 150, technique: 70, precision: 60, endurance: 50, creativite: 40 },
      suggestions: [],
      highlights: [],
    });
    expect(parseAndValidate(json).scores.fluidite).toBe(100);
  });

  it('clamps scores below 0 to 0', () => {
    const json = JSON.stringify({
      scores: { fluidite: -10, technique: 70, precision: 60, endurance: 50, creativite: 40 },
      suggestions: [],
      highlights: [],
    });
    expect(parseAndValidate(json).scores.fluidite).toBe(0);
  });

  it('defaults missing suggestions to empty array', () => {
    const json = JSON.stringify({
      scores: { fluidite: 50, technique: 50, precision: 50, endurance: 50, creativite: 50 },
      highlights: [],
    });
    expect(parseAndValidate(json).suggestions).toEqual([]);
  });

  it('defaults missing highlights to empty array', () => {
    const json = JSON.stringify({
      scores: { fluidite: 50, technique: 50, precision: 50, endurance: 50, creativite: 50 },
      suggestions: [],
    });
    expect(parseAndValidate(json).highlights).toEqual([]);
  });

  it('extracts JSON from text with surrounding content', () => {
    const text = 'Voici mon analyse:\n' + validJson + '\nMerci.';
    const result = parseAndValidate(text);
    expect(result.scores.fluidite).toBe(80);
  });

  it('throws if no JSON object found', () => {
    expect(() => parseAndValidate('no json here')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm test:run --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `buildPrompt` and `parseAndValidate` not exported.

- [ ] **Step 3: Rewrite video-analysis.service.ts**

Replace entire file content:

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { env } from '../env';

export interface AnalysisScores {
  fluidite: number;
  technique: number;
  precision: number;
  endurance: number;
  creativite: number;
  global: number;
}

export interface ClaudeAnalysisResult {
  scores: {
    fluidite: number;
    technique: number;
    precision: number;
    endurance: number;
    creativite: number;
  };
  suggestions: string[];
  highlights: string[];
}

export function buildPrompt(routeName: string): string {
  return `Tu es un coach d'escalade de bloc expert. Analyse cette vidéo de grimpe dans son intégralité.

Route : "${routeName}"

Tu vois l'ensemble du bloc — utilise le contexte temporel pour évaluer les transitions, le rythme et les hésitations.

Évalue le grimpeur sur 100 selon ces critères :
- Fluidité des mouvements (30% du score global) : transitions, continuité, absence de blocages
- Technique des pieds (25%) : placement précis, utilisation optimale
- Précision sur les prises (20%) : saisie efficace, économie d'effort
- Économie de mouvement / Endurance (15%) : gestion de l'énergie, positions de repos
- Créativité / Adaptabilité (10%) : solutions originales, lecture de voie

Pour chaque suggestion, cite le moment précis si possible (ex: "À 0:12, le coude droit est trop fléchi").

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans markdown :
{
  "scores": {
    "fluidite": <nombre entre 0 et 100>,
    "technique": <nombre entre 0 et 100>,
    "precision": <nombre entre 0 et 100>,
    "endurance": <nombre entre 0 et 100>,
    "creativite": <nombre entre 0 et 100>
  },
  "suggestions": [
    "<conseil d'amélioration 1>",
    "<conseil d'amélioration 2>",
    "<conseil d'amélioration 3>"
  ],
  "highlights": [
    "<point fort observé 1>",
    "<point fort observé 2>"
  ]
}`;
}

export function parseAndValidate(text: string): ClaudeAnalysisResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as ClaudeAnalysisResult;

  for (const key of ['fluidite', 'technique', 'precision', 'endurance', 'creativite'] as const) {
    parsed.scores[key] = Math.max(0, Math.min(100, Math.round(parsed.scores[key] ?? 50)));
  }

  if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];
  if (!Array.isArray(parsed.highlights)) parsed.highlights = [];

  return parsed;
}

export async function analyzeVideoWithGemini(
  tmpPath: string,
  mimeType: string,
  routeName: string,
): Promise<ClaudeAnalysisResult> {
  if (!env.GOOGLE_API_KEY) throw new Error('Google API key not configured');

  const fileManager = new GoogleAIFileManager(env.GOOGLE_API_KEY);

  const upload = await fileManager.uploadFile(tmpPath, {
    mimeType,
    displayName: routeName,
  });

  let file = await fileManager.getFile(upload.file.name);
  let waited = 0;
  while (file.state === FileState.PROCESSING) {
    if (waited >= 90_000) throw new Error('Gemini file processing timed out');
    await new Promise(r => setTimeout(r, 5_000));
    waited += 5_000;
    file = await fileManager.getFile(upload.file.name);
  }
  if (file.state === FileState.FAILED) throw new Error('Gemini file processing failed');

  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' }); // verified working
  const result = await model.generateContent([
    { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
    { text: buildPrompt(routeName) },
  ]);

  fileManager.deleteFile(upload.file.name).catch(() => {});

  return parseAndValidate(result.response.text());
}

export function aggregateScores(result: ClaudeAnalysisResult): AnalysisScores {
  const { fluidite, technique, precision, endurance, creativite } = result.scores;
  const global = Math.round(
    fluidite * 0.30 +
    technique * 0.25 +
    precision * 0.20 +
    endurance * 0.15 +
    creativite * 0.10
  );
  return { fluidite, technique, precision, endurance, creativite, global };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && pnpm test:run --reporter=verbose 2>&1 | tail -20
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/video-analysis.service.ts apps/api/src/services/video-analysis.service.test.ts
git commit -m "feat: add Gemini File API service (buildPrompt, parseAndValidate, analyzeVideoWithGemini)"
```

---

## Task 2 — Update route to use Gemini File API

**Files:**
- Modify: `apps/api/src/routes/analyses.ts`

- [ ] **Step 1: Replace the POST /analyze-video handler**

In `apps/api/src/routes/analyses.ts`, make the following changes:

**1. Update imports** — replace `extractCloudinaryFrames, analyzeWithClaude` with `analyzeVideoWithGemini`:

```ts
// Remove:
import {
  extractCloudinaryFrames,
  analyzeWithClaude,
  aggregateScores,
} from '../services/video-analysis.service';

// Replace with:
import {
  analyzeVideoWithGemini,
  aggregateScores,
} from '../services/video-analysis.service';
```

**2. Replace the entire `if (useCloudinary)` block** (lines 78–109 in current file) and what follows up to the DB insert, with this restructured version:

```ts
    if (!useCloudinary) {
      return c.json({
        success: false,
        error: 'Video analysis requires Cloudinary to be configured.',
      }, 503);
    }

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
```

**3. Remove the old variable declarations** at lines 74–76 (`let videoUrl`, `let thumbnailUrl`, `let videoPublicId`) — they are now declared inside the block above.

**4. Delete lines 121–129 exactly** — these are the stale lines that referenced the old frame-based approach. They sit between the Cloudinary block and the DB video insert:

```ts
    // DELETE these exact lines:
    // Extract frames for analysis
    const frameUrls = extractCloudinaryFrames(videoPublicId, 5);
    console.log('[analyze-video] frame URLs:', frameUrls);

    // Analyze with Gemini
    console.log('[analyze-video] calling Gemini...');
    const claudeResult = await analyzeWithClaude(frameUrls, route.name);
    console.log('[analyze-video] Gemini done, scores:', claudeResult.scores);
    const scores = aggregateScores(claudeResult);
```

After deletion, the DB insert block (`const videoId = crypto.randomUUID()` and below) stays unchanged — `videoUrl`, `thumbnailUrl`, `claudeResult`, and `scores` are all in scope from the block above.

**5. Remove the 4 debug `console.log` lines** that remain in the handler (they were added for temporary debugging):
- `console.log('[analyze-video] parsing form data...')`
- `console.log('[analyze-video] file size:', ...)`
- `console.log('[analyze-video] writing to temp file...')`
- `console.log('[analyze-video] uploading to Cloudinary ...')`

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Run API tests**

```bash
cd apps/api && pnpm test:run 2>&1 | tail -10
```

Expected: PASS (same 8 tests as Task 1).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/analyses.ts
git commit -m "feat: update analyze-video route to use Gemini File API with correct tmpPath lifecycle"
```

---

## Task 3 — Atomic frontend prop chain update

**IMPORTANT:** All 3 files in this task must be edited before running `tsc --noEmit`. Do not run TypeScript checks between individual file edits — the chain will be broken until all 3 are updated.

**Files:**
- Modify: `apps/web/src/hooks/usePoseMetrics.ts`
- Modify: `apps/web/src/components/PoseAnalysisPlayer.tsx`
- Modify: `apps/web/src/pages/AnalysisResults.tsx`

- [ ] **Step 1: Update PoseFrame + addFrame in usePoseMetrics.ts**

Replace the `PoseFrame` interface and `addFrame` function:

```ts
export interface PoseFrame {
  t: number;           // performance.now() ms — used internally by MediaPipe
  videoTime: number;   // video.currentTime in seconds — used for chart X axis
  elbowL: number;
  elbowR: number;
  kneeL: number;
  kneeR: number;
  hipL: number;
  hipR: number;
  cog: number;
  armBalance: number;
}
```

Update `addFrame` inside `usePoseMetrics`:

```ts
  const addFrame = useCallback((landmarks: NormalizedLandmark[], t: number, videoTime: number) => {
    const lm = landmarks as Landmark[];

    const frame: PoseFrame = {
      t,
      videoTime,
      elbowL: angleDeg(lm[11], lm[13], lm[15]),
      elbowR: angleDeg(lm[12], lm[14], lm[16]),
      kneeL:  angleDeg(lm[23], lm[25], lm[27]),
      kneeR:  angleDeg(lm[24], lm[26], lm[28]),
      hipL:   angleDeg(lm[11], lm[23], lm[25]),
      hipR:   angleDeg(lm[12], lm[24], lm[26]),
      cog:    1 - (lm[23].y + lm[24].y) / 2,
      armBalance: computeArmBalance(prevLandmarksRef.current, lm),
    };

    prevLandmarksRef.current = landmarks.map(l => ({ ...l }));

    setFrames(prev => {
      const next = [...prev, frame];
      return next.length > MAX_FRAMES ? next.slice(next.length - MAX_FRAMES) : next;
    });
  }, []);
```

- [ ] **Step 2: Update PoseAnalysisPlayer.tsx — add videoTime to onLandmarks**

Update the interface at line 82:

```ts
interface PoseAnalysisPlayerProps {
  videoUrl: string;
  onLandmarks: (landmarks: NormalizedLandmark[], timestampMs: number, videoTime: number) => void;
  onSeek?: () => void;
}
```

Update the `onLandmarks` call inside the RAF loop (line 154 area). The `video` variable is in scope:

```ts
// Change:
onLandmarks(result.landmarks[0], performance.now());
// To:
onLandmarks(result.landmarks[0], performance.now(), video.currentTime);
```

Note: `performance.now()` is still passed to `cachedLandmarker!.detectForVideo(video, performance.now())` as before — only the forwarded argument to `onLandmarks` changes.

- [ ] **Step 3: Update AnalysisResults.tsx — handleLandmarks with videoTime**

Replace `handleLandmarks` (lines 75–78):

```ts
  const handleLandmarks = useCallback(
    (landmarks: NormalizedLandmark[], ts: number, videoTime: number) => {
      addFrame(landmarks, ts, videoTime);
      setCurrentT(videoTime);
    },
    [addFrame],
  );
```

Add `useCallback` to imports if not already there:
```ts
import { useState, useEffect, useCallback } from 'react';
```

`currentT` is now in seconds (video time), not ms. The prop `<PoseMetricsCharts frames={frames} currentT={currentT} />` stays the same — `PoseMetricsCharts` will use the new unit in Task 4.

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/usePoseMetrics.ts apps/web/src/components/PoseAnalysisPlayer.tsx apps/web/src/pages/AnalysisResults.tsx
git commit -m "feat: add videoTime to PoseFrame + propagate through onLandmarks callback chain"
```

---

## Task 4 — PoseMetricsCharts axes rewrite

**Files:**
- Modify: `apps/web/src/components/PoseMetricsCharts.tsx`
- Create: `apps/web/src/components/PoseMetricsCharts.test.ts`

- [ ] **Step 1: Write failing tests for chart helpers**

Create `apps/web/src/components/PoseMetricsCharts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { xOfTime, formatTime, PLOT_W, LEFT_MARGIN } from './PoseMetricsCharts';

describe('xOfTime', () => {
  it('returns 0 for videoTime=0', () => {
    expect(xOfTime(0, 60)).toBe(0);
  });

  it('returns PLOT_W for videoTime=maxVideoTime', () => {
    expect(xOfTime(60, 60)).toBe(PLOT_W);
  });

  it('returns half PLOT_W for midpoint', () => {
    expect(xOfTime(30, 60)).toBeCloseTo(PLOT_W / 2, 1);
  });

  it('returns 0 when maxVideoTime is 0 (edge case)', () => {
    expect(xOfTime(0, 0)).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats 0 as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 65 as 1:05', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats 90 as 1:30', () => {
    expect(formatTime(90)).toBe('1:30');
  });

  it('formats 5 as 0:05', () => {
    expect(formatTime(5)).toBe('0:05');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && pnpm test:run --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `xOfTime`, `formatTime`, `PLOT_W`, `LEFT_MARGIN` not exported.

- [ ] **Step 3: Rewrite PoseMetricsCharts.tsx**

Replace entire file:

```tsx
import type { PoseFrame } from '../hooks/usePoseMetrics';

interface PoseMetricsChartsProps {
  frames: PoseFrame[];
  currentT: number; // video seconds
}

// ─── Layout constants (exported for tests) ───────────────────────────────────

export const TOTAL_W = 640;
export const LEFT_MARGIN = 40;
const RIGHT_MARGIN = 8;
const BOTTOM_MARGIN = 20;
export const PLOT_W = TOTAL_W - LEFT_MARGIN - RIGHT_MARGIN; // 592

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

export function xOfTime(videoTimeSec: number, maxVideoTime: number): number {
  if (maxVideoTime <= 0) return 0;
  return (videoTimeSec / maxVideoTime) * PLOT_W;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function polylinePoints(
  frames: PoseFrame[],
  getValue: (f: PoseFrame) => number,
  yMin: number,
  yMax: number,
  plotH: number,
  maxVideoTime: number,
): string {
  return frames
    .map(f => {
      const x = LEFT_MARGIN + xOfTime(f.videoTime, maxVideoTime);
      const y = plotH - ((getValue(f) - yMin) / (yMax - yMin)) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ─── Shared SVG sub-components ────────────────────────────────────────────────

function YAxis({
  ticks, yMin, yMax, plotH, labels,
}: {
  ticks: number[];
  yMin: number;
  yMax: number;
  plotH: number;
  labels?: string[];
}) {
  return (
    <>
      {/* Axis line */}
      <line x1={LEFT_MARGIN} y1={0} x2={LEFT_MARGIN} y2={plotH} stroke="#d1d5db" strokeWidth={1} />
      {ticks.map((tick, i) => {
        const y = plotH - ((tick - yMin) / (yMax - yMin)) * plotH;
        const label = labels ? labels[i] : String(tick);
        return (
          <g key={tick}>
            <line x1={LEFT_MARGIN} y1={y} x2={LEFT_MARGIN + PLOT_W} y2={y} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="3 3" />
            <text x={LEFT_MARGIN - 4} y={y + 4} fontSize={9} fill="#9ca3af" textAnchor="end">{label}</text>
          </g>
        );
      })}
    </>
  );
}

function XAxis({
  maxVideoTime,
  plotH,
}: {
  maxVideoTime: number;
  plotH: number;
}) {
  if (maxVideoTime <= 0) return null;
  const tickInterval = maxVideoTime <= 30 ? 5 : maxVideoTime <= 120 ? 10 : 30;
  const ticks: number[] = [];
  for (let t = 0; t <= maxVideoTime; t += tickInterval) {
    ticks.push(t);
  }
  return (
    <>
      {ticks.map(t => {
        const x = LEFT_MARGIN + xOfTime(t, maxVideoTime);
        return (
          <g key={t}>
            <line x1={x} y1={plotH} x2={x} y2={plotH + 4} stroke="#d1d5db" strokeWidth={1} />
            <text x={x} y={plotH + 14} fontSize={9} fill="#9ca3af" textAnchor="middle">{formatTime(t)}</text>
          </g>
        );
      })}
    </>
  );
}

// ─── Chart 1: Joint angles ────────────────────────────────────────────────────

const JOINT_LINES: { key: keyof PoseFrame; label: string; color: string }[] = [
  { key: 'elbowL', label: 'Coude G', color: '#06b6d4' },
  { key: 'elbowR', label: 'Coude D', color: '#0891b2' },
  { key: 'kneeL',  label: 'Genou G', color: '#22c55e' },
  { key: 'kneeR',  label: 'Genou D', color: '#15803d' },
  { key: 'hipL',   label: 'Hanche G', color: '#fb923c' },
  { key: 'hipR',   label: 'Hanche D', color: '#c2410c' },
];

function JointAnglesChart({ frames, currentT }: PoseMetricsChartsProps) {
  const PLOT_H = 160;
  const TOTAL_H = PLOT_H + BOTTOM_MARGIN;
  const maxVideoTime = frames.length > 0 ? frames[frames.length - 1].videoTime : 0;
  const cx = LEFT_MARGIN + xOfTime(currentT, maxVideoTime);

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Angles articulaires (°)</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {JOINT_LINES.map(l => (
          <span key={l.key} className="flex items-center gap-1 text-[10px] font-bold text-climb-dark/70">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full h-48" preserveAspectRatio="none">
        <YAxis ticks={[0, 45, 90, 135, 180]} yMin={0} yMax={180} plotH={PLOT_H} />
        <XAxis maxVideoTime={maxVideoTime} plotH={PLOT_H} />
        {JOINT_LINES.map(l => (
          <polyline
            key={l.key}
            points={polylinePoints(frames, f => f[l.key] as number, 0, 180, PLOT_H, maxVideoTime)}
            fill="none" stroke={l.color} strokeWidth={1.5} strokeLinejoin="round"
          />
        ))}
        <line x1={cx} y1={0} x2={cx} y2={PLOT_H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Chart 2: Centre de gravité ───────────────────────────────────────────────

function smoothCog(frames: PoseFrame[]): number[] {
  return frames.map((_, i) => {
    const start = Math.max(0, i - 2);
    const end = Math.min(frames.length - 1, i + 2);
    const slice = frames.slice(start, end + 1);
    return slice.reduce((s, f) => s + f.cog, 0) / slice.length;
  });
}

function CogChart({ frames, currentT }: PoseMetricsChartsProps) {
  const PLOT_H = 100;
  const TOTAL_H = PLOT_H + BOTTOM_MARGIN;
  const maxVideoTime = frames.length > 0 ? frames[frames.length - 1].videoTime : 0;
  const cx = LEFT_MARGIN + xOfTime(currentT, maxVideoTime);
  const smooth = smoothCog(frames);

  const points = smooth
    .map((v, i) => `${(LEFT_MARGIN + xOfTime(frames[i].videoTime, maxVideoTime)).toFixed(1)},${(PLOT_H - v * PLOT_H).toFixed(1)}`)
    .join(' ');
  const fillPoints = `${LEFT_MARGIN},${PLOT_H} ${points} ${LEFT_MARGIN + PLOT_W},${PLOT_H}`;

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Centre de gravité</p>
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cogGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <YAxis
          ticks={[0, 0.5, 1]}
          yMin={0} yMax={1} plotH={PLOT_H}
          labels={['bas', '—', 'haut']}
        />
        <XAxis maxVideoTime={maxVideoTime} plotH={PLOT_H} />
        <polygon points={fillPoints} fill="url(#cogGrad)" />
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
        <line x1={cx} y1={0} x2={cx} y2={PLOT_H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Chart 3: Équilibre bras ──────────────────────────────────────────────────

function ArmBalanceChart({ frames, currentT }: PoseMetricsChartsProps) {
  const PLOT_H = 100;
  const TOTAL_H = PLOT_H + BOTTOM_MARGIN;
  const maxVideoTime = frames.length > 0 ? frames[frames.length - 1].videoTime : 0;
  const cx = LEFT_MARGIN + xOfTime(currentT, maxVideoTime);

  // Zone rects: value 0 = bottom (y=PLOT_H), value 1 = top (y=0)
  // zone 0.6–1.0 → y from 0 to PLOT_H*0.4
  const zoneTop    = { y: 0,              h: PLOT_H * 0.4, color: '#fb923c', label: 'D' };
  const zoneMiddle = { y: PLOT_H * 0.4,   h: PLOT_H * 0.2, color: '#22c55e', label: 'éq' };
  const zoneBottom = { y: PLOT_H * 0.6,   h: PLOT_H * 0.4, color: '#3b82f6', label: 'G' };

  const points = polylinePoints(frames, f => f.armBalance, 0, 1, PLOT_H, maxVideoTime);

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Équilibre bras</p>
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Color zones */}
        {[zoneTop, zoneMiddle, zoneBottom].map(z => (
          <rect key={z.label} x={LEFT_MARGIN} y={z.y} width={PLOT_W} height={z.h} fill={z.color} fillOpacity={0.08} />
        ))}
        <YAxis
          ticks={[0, 0.5, 1]}
          yMin={0} yMax={1} plotH={PLOT_H}
          labels={['G', 'éq', 'D']}
        />
        <XAxis maxVideoTime={maxVideoTime} plotH={PLOT_H} />
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinejoin="round" />
        <line x1={cx} y1={0} x2={cx} y2={PLOT_H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────────

export function PoseMetricsCharts({ frames, currentT }: PoseMetricsChartsProps) {
  return (
    <div className="space-y-4 mt-4">
      <JointAnglesChart frames={frames} currentT={currentT} />
      <CogChart frames={frames} currentT={currentT} />
      <ArmBalanceChart frames={frames} currentT={currentT} />
    </div>
  );
}
```

- [ ] **Step 4: Run all web tests**

```bash
cd apps/web && pnpm test:run --reporter=verbose 2>&1 | tail -30
```

Expected: all tests PASS including the 8 new chart helper tests.

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/PoseMetricsCharts.tsx apps/web/src/components/PoseMetricsCharts.test.ts
git commit -m "feat: add X/Y axes to MediaPipe charts (video time timeline, labeled scales)"
```

---

## Final verification

- [ ] **Run all tests across both packages**

```bash
cd apps/api && pnpm test:run 2>&1 | tail -5
cd apps/web && pnpm test:run 2>&1 | tail -5
```

Expected: all tests pass in both packages.

- [ ] **Start dev server and manual smoke test**

```bash
# In separate terminals:
npx tsx apps/api/src/index.ts
cd apps/web && pnpm dev
```

Manual checks:
1. Upload a climbing video via the app → confirm request completes without ERR_CONNECTION_ABORTED
2. Navigate to the analysis results page → confirm Gemini scores are shown
3. Play the video → confirm charts appear after 10 frames with `M:SS` labels on X axis and degree/value labels on Y axis
4. Seek in the video → confirm cursor moves to correct position on X axis
