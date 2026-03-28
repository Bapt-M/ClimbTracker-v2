# MediaPipe Skeleton Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher le squelette du grimpeur en temps réel sur la vidéo d'analyse et calculer 3 métriques biomécaniques (angles articulaires, centre de gravité, balance bras/jambes).

**Architecture:** 100% client-side — `PoseAnalysisPlayer` run MediaPipe `PoseLandmarker` dans une boucle RAF sur la vidéo Cloudinary, émet les landmarks à `usePoseMetrics` qui accumule les frames et calcule les métriques, `PoseMetricsCharts` les visualise en SVG natif. Seul changement backend : exposer le champ `url` de la vidéo dans le GET `/api/analysis/:id`.

**Tech Stack:** `@mediapipe/tasks-vision` (npm), React hooks, SVG natif, Vitest (tests math pures), TypeScript, Tailwind CSS.

---

## File Map

| Action | File | Rôle |
|--------|------|------|
| Modify | `apps/api/src/routes/analyses.ts:204-213` | Ajoute `url: true` dans la projection video |
| Modify | `apps/web/src/lib/api/index.ts:740` | Ajoute `url: string` dans le type `Analysis.video` |
| Modify | `apps/web/package.json` | Ajoute `@mediapipe/tasks-vision` |
| Create | `apps/web/src/lib/pose-math.ts` | Fonctions mathématiques pures (angle, armBalance) — testables |
| Create | `apps/web/src/lib/pose-math.test.ts` | Tests Vitest des fonctions mathématiques |
| Create | `apps/web/src/hooks/usePoseMetrics.ts` | Hook React : accumule les frames, appelle pose-math |
| Create | `apps/web/src/components/PoseAnalysisPlayer.tsx` | Vidéo + canvas overlay + boucle MediaPipe |
| Create | `apps/web/src/components/PoseMetricsCharts.tsx` | 3 graphiques SVG |
| Modify | `apps/web/src/pages/AnalysisResults.tsx:1-4,135` | Importe et intègre les nouveaux composants |

---

## Task 1: Expose video URL from API + update frontend type

**Files:**
- Modify: `apps/api/src/routes/analyses.ts:204-213`
- Modify: `apps/web/src/lib/api/index.ts:740`

- [ ] **Step 1: Add `url: true` to the video projection in `GET /api/analysis/:id`**

In `apps/api/src/routes/analyses.ts`, find the `GET /:id` handler (around line 200). The current `with: { video: { columns: ... } }` block is:

```ts
with: {
  video: {
    columns: { id: true, thumbnailUrl: true, uploadedAt: true },
  },
```

Change to:

```ts
with: {
  video: {
    columns: { id: true, url: true, thumbnailUrl: true, uploadedAt: true },
  },
```

- [ ] **Step 2: Add `url` to the TypeScript type in the frontend API client**

In `apps/web/src/lib/api/index.ts`, line 740, change:

```ts
video?: { id: string; thumbnailUrl: string; uploadedAt: string };
```

to:

```ts
video?: { id: string; url: string; thumbnailUrl: string; uploadedAt: string };
```

- [ ] **Step 3: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors about the `video.url` field.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/analyses.ts apps/web/src/lib/api/index.ts
git commit -m "feat: expose video.url in GET /api/analysis/:id"
```

---

## Task 2: Install @mediapipe/tasks-vision

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install the package**

```bash
cd apps/web && pnpm add @mediapipe/tasks-vision
```

- [ ] **Step 2: Verify it resolves**

```bash
node -e "require.resolve('@mediapipe/tasks-vision')" && echo "OK"
```

Expected: prints the resolved path then "OK".

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add @mediapipe/tasks-vision dependency"
```

---

## Task 3: Pure math functions + unit tests

**Files:**
- Create: `apps/web/src/lib/pose-math.ts`
- Create: `apps/web/src/lib/pose-math.test.ts`

The math is extracted into pure functions so they can be tested without browser APIs.

- [ ] **Step 1: Write the failing tests first**

Create `apps/web/src/lib/pose-math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { angleDeg, computeArmBalance } from './pose-math';

// Helper: make a minimal NormalizedLandmark-like object
const pt = (x: number, y: number) => ({ x, y, z: 0, visibility: 1 });

describe('angleDeg', () => {
  it('returns 90 for a right angle', () => {
    // A=(0,1) B=(0,0) C=(1,0) → angle at B = 90°
    const result = angleDeg(pt(0, 1), pt(0, 0), pt(1, 0));
    expect(result).toBeCloseTo(90, 1);
  });

  it('returns 180 for collinear points', () => {
    // A=(-1,0) B=(0,0) C=(1,0) → 180°
    const result = angleDeg(pt(-1, 0), pt(0, 0), pt(1, 0));
    expect(result).toBeCloseTo(180, 1);
  });

  it('returns 0 for same direction', () => {
    // A=(1,0) B=(0,0) C=(1,0) → 0°
    const result = angleDeg(pt(1, 0), pt(0, 0), pt(1, 0));
    expect(result).toBeCloseTo(0, 1);
  });

  it('returns 0 when vectors have zero magnitude', () => {
    // degenerate: A=B
    const result = angleDeg(pt(0, 0), pt(0, 0), pt(1, 0));
    expect(result).toBe(0);
  });
});

describe('computeArmBalance', () => {
  it('returns 0.5 when both velocities are zero (first frame)', () => {
    const result = computeArmBalance(null, [
      pt(0.5, 0.5), pt(0.5, 0.5), // shoulders 11,12
      pt(0.5, 0.5), pt(0.5, 0.5), // elbows 13,14
      pt(0.5, 0.5), pt(0.5, 0.5), // wrists 15,16
      // fill rest up to index 28 with static points
      ...Array(22).fill(null).map(() => pt(0.5, 0.5)),
    ]);
    expect(result).toBe(0.5);
  });

  it('returns close to 1 when only upper body moves', () => {
    const prev = Array(29).fill(null).map(() => pt(0.5, 0.5));
    const curr = [...prev];
    // Move shoulders (11,12), elbows (13,14), wrists (15,16) significantly
    curr[11] = pt(0.6, 0.5);
    curr[12] = pt(0.6, 0.5);
    curr[13] = pt(0.6, 0.5);
    curr[14] = pt(0.6, 0.5);
    curr[15] = pt(0.6, 0.5);
    curr[16] = pt(0.6, 0.5);
    const result = computeArmBalance(prev, curr);
    expect(result).toBeGreaterThan(0.9);
  });

  it('returns close to 0 when only lower body moves', () => {
    const prev = Array(29).fill(null).map(() => pt(0.5, 0.5));
    const curr = [...prev];
    // Move hips (23,24), knees (25,26), ankles (27,28)
    curr[23] = pt(0.6, 0.5);
    curr[24] = pt(0.6, 0.5);
    curr[25] = pt(0.6, 0.5);
    curr[26] = pt(0.6, 0.5);
    curr[27] = pt(0.6, 0.5);
    curr[28] = pt(0.6, 0.5);
    const result = computeArmBalance(prev, curr);
    expect(result).toBeLessThan(0.1);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail (module not found)**

```bash
cd apps/web && pnpm test:run --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|pose-math"
```

Expected: error about `pose-math` not found.

- [ ] **Step 3: Create `apps/web/src/lib/pose-math.ts`**

```ts
// Pure math helpers for pose analysis — no browser APIs, fully testable.

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

const EPSILON = 1e-6;

/**
 * Angle in degrees at vertex B formed by A-B-C.
 * Returns 0 if either vector has zero magnitude.
 */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const magBA = Math.sqrt(bax * bax + bay * bay);
  const magBC = Math.sqrt(bcx * bcx + bcy * bcy);
  if (magBA < EPSILON || magBC < EPSILON) return 0;
  const cosA = (bax * bcx + bay * bcy) / (magBA * magBC);
  return Math.acos(Math.max(-1, Math.min(1, cosA))) * (180 / Math.PI);
}

/**
 * Frame-to-frame velocity (Euclidean distance in normalized coords).
 */
function vel(a: Landmark, b: Landmark): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * armBalance = velUpper / (velUpper + velLower + ε)
 *
 * Upper: shoulders (11,12), elbows (13,14), wrists (15,16)
 * Lower: hips (23,24), knees (25,26), ankles (27,28)
 *
 * Returns 0.5 when prev is null (first frame) or both velocities ≈ 0.
 */
export function computeArmBalance(
  prev: Landmark[] | null,
  curr: Landmark[],
): number {
  if (!prev) return 0.5;

  const upperIdx = [11, 12, 13, 14, 15, 16];
  const lowerIdx = [23, 24, 25, 26, 27, 28];

  const velUpper =
    upperIdx.reduce((sum, i) => sum + vel(prev[i], curr[i]), 0) / upperIdx.length;
  const velLower =
    lowerIdx.reduce((sum, i) => sum + vel(prev[i], curr[i]), 0) / lowerIdx.length;

  if (velUpper + velLower < EPSILON) return 0.5;

  return velUpper / (velUpper + velLower + EPSILON);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd apps/web && pnpm test:run --reporter=verbose 2>&1 | grep -E "PASS|FAIL|pose-math"
```

Expected: all `pose-math` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/pose-math.ts apps/web/src/lib/pose-math.test.ts
git commit -m "feat: add pose-math pure functions with unit tests"
```

---

## Task 4: usePoseMetrics hook

**Files:**
- Create: `apps/web/src/hooks/usePoseMetrics.ts`

- [ ] **Step 1: Create `apps/web/src/hooks/usePoseMetrics.ts`**

```ts
import { useState, useCallback, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { angleDeg, computeArmBalance, type Landmark } from '../lib/pose-math';

export interface PoseFrame {
  t: number;
  elbowL: number;
  elbowR: number;
  kneeL: number;
  kneeR: number;
  hipL: number;
  hipR: number;
  cog: number;
  armBalance: number;
}

const MAX_FRAMES = 2000;

export function usePoseMetrics() {
  const [frames, setFrames] = useState<PoseFrame[]>([]);
  const prevLandmarksRef = useRef<Landmark[] | null>(null);

  const addFrame = useCallback((landmarks: NormalizedLandmark[], t: number) => {
    const lm = landmarks as Landmark[];

    const frame: PoseFrame = {
      t,
      // Elbows: shoulder – elbow – wrist
      elbowL: angleDeg(lm[11], lm[13], lm[15]),
      elbowR: angleDeg(lm[12], lm[14], lm[16]),
      // Knees: hip – knee – ankle
      kneeL: angleDeg(lm[23], lm[25], lm[27]),
      kneeR: angleDeg(lm[24], lm[26], lm[28]),
      // Hips: shoulder – hip – knee
      hipL: angleDeg(lm[11], lm[23], lm[25]),
      hipR: angleDeg(lm[12], lm[24], lm[26]),
      // CoG: 1 - avg hip y (y=0 is top in MediaPipe, we want 0=bottom)
      cog: 1 - (lm[23].y + lm[24].y) / 2,
      armBalance: computeArmBalance(prevLandmarksRef.current, lm),
    };

    prevLandmarksRef.current = lm;

    setFrames(prev => {
      const next = [...prev, frame];
      return next.length > MAX_FRAMES ? next.slice(next.length - MAX_FRAMES) : next;
    });
  }, []);

  const reset = useCallback(() => {
    setFrames([]);
    prevLandmarksRef.current = null;
  }, []);

  return { frames, addFrame, reset };
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "usePoseMetrics\|pose-math" || echo "No type errors"
```

Expected: "No type errors"

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/usePoseMetrics.ts
git commit -m "feat: add usePoseMetrics hook"
```

---

## Task 5: PoseAnalysisPlayer component

**Files:**
- Create: `apps/web/src/components/PoseAnalysisPlayer.tsx`

- [ ] **Step 1: Create `apps/web/src/components/PoseAnalysisPlayer.tsx`**

```tsx
import { useRef, useEffect, useState } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ─── Skeleton drawing config ─────────────────────────────────────────────────

const CONNECTIONS: [number, number][] = [
  // Arms
  [11, 13], [13, 15], [12, 14], [14, 16],
  // Legs
  [23, 25], [25, 27], [24, 26], [26, 28],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
];

function getColor(a: number, b: number): string {
  const arms = new Set([11, 12, 13, 14, 15, 16]);
  const legs = new Set([23, 24, 25, 26, 27, 28]);
  if (arms.has(a) && arms.has(b)) return '#08D9D6'; // cyan
  if (legs.has(a) && legs.has(b)) return '#2ECC71'; // green
  return '#FDFCF0'; // cream (torso)
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number,
) {
  for (const [a, b] of CONNECTIONS) {
    const lA = landmarks[a];
    const lB = landmarks[b];
    if (!lA || !lB) continue;
    if ((lA.visibility ?? 1) < 0.5 || (lB.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(lA.x * w, lA.y * h);
    ctx.lineTo(lB.x * w, lB.y * h);
    ctx.strokeStyle = getColor(a, b);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
}

// ─── Module-level model cache ─────────────────────────────────────────────────

let cachedLandmarker: PoseLandmarker | null = null;
let loadPromise: Promise<PoseLandmarker> | null = null;

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (cachedLandmarker) return cachedLandmarker;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );
    const lm = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    cachedLandmarker = lm;
    return lm;
  })();

  return loadPromise;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PoseAnalysisPlayerProps {
  videoUrl: string;
  onLandmarks: (landmarks: NormalizedLandmark[], timestampMs: number) => void;
  onSeek?: () => void;
}

export function PoseAnalysisPlayer({ videoUrl, onLandmarks, onSeek }: PoseAnalysisPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Load model on mount; cancel RAF on unmount
  useEffect(() => {
    let cancelled = false;

    getPoseLandmarker()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg('Échec du chargement du modèle — rechargez la page');
        }
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      // NOTE: intentionally do NOT call cachedLandmarker.close() here.
      // The landmarker lives in a module-level cache shared across navigations.
      // Closing it would break any other mounted PoseAnalysisPlayer instance.
    };
  }, []);

  // Sync canvas size to video via ResizeObserver
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const sync = () => {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    };
    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // RAF detection loop — starts on play, stops on pause/end
  const startLoop = () => {
    if (!cachedLandmarker) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      if (video.paused || video.ended) return;

      try {
        const result = cachedLandmarker!.detectForVideo(video, performance.now());
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result.landmarks[0]) {
          drawSkeleton(ctx, result.landmarks[0], canvas.width, canvas.height);
          onLandmarks(result.landmarks[0], performance.now());
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'SecurityError') {
          cancelAnimationFrame(rafRef.current);
          setStatus('error');
          setErrorMsg('Vidéo non accessible (CORS)');
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const stopLoop = () => cancelAnimationFrame(rafRef.current);

  return (
    <div className="relative w-full">
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        controls
        className="w-full rounded-2xl border-2 border-climb-dark"
        onPlay={startLoop}
        onPause={stopLoop}
        onEnded={stopLoop}
        onSeeked={onSeek}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl"
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="bg-climb-dark/80 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            Chargement du modèle...
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="bg-hold-pink/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            {errorMsg}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "PoseAnalysisPlayer\|mediapipe" || echo "No type errors"
```

Expected: "No type errors"

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/PoseAnalysisPlayer.tsx
git commit -m "feat: add PoseAnalysisPlayer with MediaPipe skeleton overlay"
```

---

## Task 6: PoseMetricsCharts component

**Files:**
- Create: `apps/web/src/components/PoseMetricsCharts.tsx`

- [ ] **Step 1: Create `apps/web/src/components/PoseMetricsCharts.tsx`**

```tsx
import type { PoseFrame } from '../hooks/usePoseMetrics';

interface PoseMetricsChartsProps {
  frames: PoseFrame[];
  currentT: number;
}

// ─── Shared SVG chart helper ───────────────────────────────────────────────────

const W = 600;

function xOf(i: number, total: number): number {
  return total <= 1 ? 0 : (i / (total - 1)) * W;
}

function polyline(
  frames: PoseFrame[],
  getValue: (f: PoseFrame) => number,
  yMin: number,
  yMax: number,
  h: number,
): string {
  return frames
    .map((f, i) => {
      const x = xOf(i, frames.length);
      const y = h - ((getValue(f) - yMin) / (yMax - yMin)) * h;
      return `${x},${y}`;
    })
    .join(' ');
}

// Find x position for the current timestamp
function currentX(frames: PoseFrame[], currentT: number): number {
  if (frames.length < 2) return 0;
  const tMin = frames[0].t;
  const tMax = frames[frames.length - 1].t;
  if (tMax === tMin) return 0;
  return Math.max(0, Math.min(W, ((currentT - tMin) / (tMax - tMin)) * W));
}

// ─── Chart 1: Joint angles ────────────────────────────────────────────────────

const JOINT_LINES = [
  { key: 'elbowL' as keyof PoseFrame, label: 'Coude G', color: '#06b6d4' },
  { key: 'elbowR' as keyof PoseFrame, label: 'Coude D', color: '#0891b2' },
  { key: 'kneeL' as keyof PoseFrame, label: 'Genou G', color: '#22c55e' },
  { key: 'kneeR' as keyof PoseFrame, label: 'Genou D', color: '#15803d' },
  { key: 'hipL' as keyof PoseFrame, label: 'Hanche G', color: '#fb923c' },
  { key: 'hipR' as keyof PoseFrame, label: 'Hanche D', color: '#c2410c' },
];

function JointAnglesChart({ frames, currentT }: PoseMetricsChartsProps) {
  const H = 160; // h-48 ≈ 192px, inner chart area
  const cx = currentX(frames, currentT);

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Angles articulaires</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {JOINT_LINES.map(l => (
          <span key={l.key} className="flex items-center gap-1 text-[10px] font-bold text-climb-dark/70">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" preserveAspectRatio="none">
        {/* Y axis labels */}
        {[0, 90, 180].map(deg => {
          const y = H - (deg / 180) * H;
          return (
            <g key={deg}>
              <line x1={0} y1={y} x2={W} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            </g>
          );
        })}

        {/* Polylines */}
        {JOINT_LINES.map(l => (
          <polyline
            key={l.key}
            points={polyline(frames, f => f[l.key] as number, 0, 180, H)}
            fill="none"
            stroke={l.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}

        {/* Current position */}
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Chart 2: Centre de gravité ───────────────────────────────────────────────

// 5-frame moving average
function smoothCog(frames: PoseFrame[]): number[] {
  return frames.map((_, i) => {
    const start = Math.max(0, i - 2);
    const end = Math.min(frames.length - 1, i + 2);
    const slice = frames.slice(start, end + 1);
    return slice.reduce((s, f) => s + f.cog, 0) / slice.length;
  });
}

function CogChart({ frames, currentT }: PoseMetricsChartsProps) {
  const H = 100;
  const W_local = W;
  const smooth = smoothCog(frames);
  const cx = currentX(frames, currentT);

  const points = smooth
    .map((v, i) => `${xOf(i, smooth.length)},${H - v * H}`)
    .join(' ');

  const fillPoints = `0,${H} ${points} ${W_local},${H}`;

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Centre de gravité</p>
      <svg viewBox={`0 0 ${W_local} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cogGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#cogGrad)" />
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Chart 3: Balance bras/jambes ─────────────────────────────────────────────

function ArmBalanceChart({ frames, currentT }: PoseMetricsChartsProps) {
  const H = 100;
  const cx = currentX(frames, currentT);
  const points = frames
    .map((f, i) => `${xOf(i, frames.length)},${H - f.armBalance * H}`)
    .join(' ');

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Balance bras / jambes</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Zones */}
        <rect x={0} y={0} width={W} height={H * 0.4} fill="#22c55e" fillOpacity={0.08} />
        <rect x={0} y={H * 0.4} width={W} height={H * 0.2} fill="#6b7280" fillOpacity={0.06} />
        <rect x={0} y={H * 0.6} width={W} height={H * 0.4} fill="#ef4444" fillOpacity={0.08} />

        {/* Zone labels */}
        <text x={4} y={12} fontSize={8} fill="#15803d" fontWeight="bold">Bonnes jambes</text>
        <text x={4} y={H - 4} fontSize={8} fill="#b91c1c" fontWeight="bold">Sur-utilisation bras</text>

        {/* Curve */}
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinejoin="round" />

        {/* Current position */}
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
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

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "PoseMetricsCharts\|pose-math\|usePoseMetrics" || echo "No type errors"
```

Expected: "No type errors"

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/PoseMetricsCharts.tsx
git commit -m "feat: add PoseMetricsCharts (joint angles, CoG, arm balance)"
```

---

## Task 7: Integrate into AnalysisResults

**Files:**
- Modify: `apps/web/src/pages/AnalysisResults.tsx`

- [ ] **Step 1: Add imports at the top of `AnalysisResults.tsx`**

The file currently has `import { useState, useEffect } from 'react';` on line 1 — do NOT add useState again. Add only these 4 imports after the existing import block:

```tsx
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { PoseAnalysisPlayer } from '../components/PoseAnalysisPlayer';
import { PoseMetricsCharts } from '../components/PoseMetricsCharts';
import { usePoseMetrics } from '../hooks/usePoseMetrics';
```

- [ ] **Step 2: Add hook instantiation inside the component**

Inside `AnalysisResults` (after the existing `useState` declarations around line 65-67), add:

```tsx
const { frames, addFrame, reset } = usePoseMetrics();
const [currentT, setCurrentT] = useState(0);

const handleLandmarks = (landmarks: NormalizedLandmark[], t: number) => {
  addFrame(landmarks, t);
  setCurrentT(t);
};
```

- [ ] **Step 3: Add the "Analyse de mouvement" section in the JSX**

In the `<div className="px-4 py-6 pb-12 ...">` section (around line 135), just before the closing `</div>` and after the "Retour à la voie" link, add:

```tsx
{analysis.video?.url && (
  <div className="neo-card p-5 space-y-3">
    <h2 className="font-extrabold text-climb-dark flex items-center gap-2">
      <span className="material-symbols-outlined text-hold-blue text-[20px]">accessibility</span>
      Analyse de mouvement
    </h2>
    <PoseAnalysisPlayer
      videoUrl={analysis.video.url}
      onLandmarks={handleLandmarks}
      onSeek={reset}
    />
    {frames.length === 0 && (
      <p className="text-sm text-climb-dark/50 text-center py-4">
        Lance la vidéo pour voir l'analyse de mouvement
      </p>
    )}
    {frames.length > 10 && (
      <PoseMetricsCharts frames={frames} currentT={currentT} />
    )}
  </div>
)}
```

- [ ] **Step 4: TypeScript check — full project**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
cd apps/web && pnpm test:run
```

Expected: all tests pass (including the pose-math unit tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/AnalysisResults.tsx
git commit -m "feat: integrate MediaPipe skeleton analysis in AnalysisResults"
```

---

## Manual Verification Checklist

After all tasks are complete, verify end-to-end in the browser:

1. Navigate to an existing analysis at `/analysis/:id`
2. The "Analyse de mouvement" section appears below the scores (only if the analysis has a video with a URL)
3. A badge "Chargement du modèle..." appears briefly while MediaPipe loads (~3-5s first time)
4. Press play — the skeleton overlay animates on the video
5. After a few seconds of playback, the 3 charts appear below the player
6. Scrubbing the video resets the charts (onSeek → reset)
7. Reload the page — the model loads faster (cached in module scope)
8. If Cloudinary is not configured (no video.url), the section is hidden — no crash

---

## Notes for implementer

- The `analysis.video?.url` guard handles cases where old analyses were created before the API fix — their `video` object won't have `url` and the section simply won't show.
- `@mediapipe/tasks-vision` loads WASM from a CDN; in dev the browser must be online.
- The `GPU` delegate falls back to CPU automatically if GPU is unavailable.
- All Tailwind classes used (`neo-card`, `btn-neo`, etc.) already exist in the project's design system.
