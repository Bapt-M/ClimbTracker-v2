# Gemini Video Analysis + MediaPipe Charts — Design Spec

## Goal

Two improvements to the analysis experience:
- **B**: Replace 5-frame static analysis with direct Gemini File API video upload for temporal analysis
- **C**: Restructure the results page layout and add proper X/Y axes to the MediaPipe charts

---

## B — Gemini File API Video Analysis

### Current state

`video-analysis.service.ts` extracts 5 JPEG frames from Cloudinary (percentage offsets), fetches them as base64 `inlineData`, sends them to `gemini-3.1-pro-preview`. Gemini sees 5 static snapshots with no temporal context.

### New flow

```
POST /api/ai/analyze-video
  → parse FormData
  → write tmpFile
  → try {
      cloudinaryResult = await cloudinary.uploader.upload(tmpPath)   // storage
      claudeResult     = await analyzeVideoWithGemini(tmpPath, ...)  // analysis
    } finally {
      unlinkSync(tmpPath)   // always deleted, after BOTH operations
    }
  → store video + analysis in DB
  → return analysisId
```

`tmpPath` is deleted in a `finally` block that wraps **both** the Cloudinary upload AND the Gemini analysis call. The file must still exist when `analyzeVideoWithGemini` runs.

### Files changed

**`apps/api/src/services/video-analysis.service.ts`**

Remove: `extractCloudinaryFrames`, frame-fetch logic, `inlineData` base64 approach.

Add: `analyzeVideoWithGemini(tmpPath: string, mimeType: string, routeName: string): Promise<ClaudeAnalysisResult>`

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';

export async function analyzeVideoWithGemini(
  tmpPath: string,
  mimeType: string,
  routeName: string,
): Promise<ClaudeAnalysisResult> {
  const fileManager = new GoogleAIFileManager(env.GOOGLE_API_KEY!);

  // Upload video to Gemini File API
  const upload = await fileManager.uploadFile(tmpPath, { mimeType, displayName: routeName });

  // Poll until ACTIVE (max 90s, every 5s)
  let file = await fileManager.getFile(upload.file.name);
  let waited = 0;
  while (file.state === FileState.PROCESSING) {
    if (waited >= 90_000) throw new Error('Gemini file processing timed out');
    await new Promise(r => setTimeout(r, 5_000));
    waited += 5_000;
    file = await fileManager.getFile(upload.file.name);
  }
  if (file.state === FileState.FAILED) throw new Error('Gemini file processing failed');

  // Generate analysis
  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' }); // verified working in this project
  const result = await model.generateContent([
    { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
    { text: buildPrompt(routeName) },
  ]);

  // Delete Gemini file (fire-and-forget — failure is non-critical)
  fileManager.deleteFile(upload.file.name).catch(() => {});

  return parseAndValidate(result.response.text());
}
```

Extract prompt to `buildPrompt(routeName: string): string` and JSON parsing+validation to `parseAndValidate(text: string): ClaudeAnalysisResult` — both exported for unit testing.

**Prompt improvements** — ask Gemini to leverage temporal context:
- Identifier des moments précis ("à 0:12, le grimpeur...")
- Évaluer les transitions entre mouvements, le rythme global
- Détecter les hésitations ou blocages

**`apps/api/src/routes/analyses.ts`** — route restructure

The entire Cloudinary + Gemini block must be wrapped in a single `try/finally` so `tmpPath` is deleted after both operations complete (or either fails):

```ts
const tmpPath = join(tmpdir(), `climbtracker_${crypto.randomUUID()}${ext}`);
writeFileSync(tmpPath, buffer);

let cloudinaryResult: Awaited<ReturnType<typeof cloudinary.uploader.upload>>;
let claudeResult: ClaudeAnalysisResult;

try {
  cloudinaryResult = await cloudinary.uploader.upload(tmpPath, {
    folder: 'climbtracker/videos',
    resource_type: 'video',
    eager: [{ format: 'jpg', transformation: [{ width: 400 }] }],
    eager_async: true,
  });
  claudeResult = await analyzeVideoWithGemini(tmpPath, videoFile.type, route.name);
} finally {
  try { unlinkSync(tmpPath); } catch {}
}

// Use cloudinaryResult.secure_url, cloudinaryResult.public_id, claudeResult below
```

Remove `extractCloudinaryFrames` and `analyzeWithClaude` imports. Add `analyzeVideoWithGemini` import.

### Error handling

- Gemini timeout (>90s): throws inside `analyzeVideoWithGemini`, propagates to route try/catch, returns 500
- Gemini FAILED state: throws, same path
- Cloudinary failure: throws, propagates to route try/catch, returns 500
- `tmpPath` always deleted in `finally` regardless of which step failed
- Gemini remote file always deleted (fire-and-forget)

---

## C — Results Page Layout + Chart Axes

### Atomic change: three files must be updated together

`PoseAnalysisPlayer`, `usePoseMetrics`, and `AnalysisResults` share the `onLandmarks` callback signature. All three must be updated in the same task or TypeScript compilation will fail at the prop boundary.

**Required atomic updates:**
1. `PoseAnalysisPlayerProps.onLandmarks`: add third arg `videoTime: number`
2. `PoseFrame`: add `videoTime: number` field (keep existing `t: number` as `timestampMs`)
3. `usePoseMetrics.addFrame`: add third arg `videoTime: number`
4. `AnalysisResults.handleLandmarks`: accept and forward `videoTime`
5. `PoseMetricsCharts`: switch X axis from `f.t` (ms) to `f.videoTime` (seconds)

### Layout restructure (`AnalysisResults.tsx`)

New order:
1. Back link
2. Route info header
3. **Gemini scores** (global + 5 dimensions) — always visible
4. **Gemini suggestions + highlights** — always visible
5. **Analyse de mouvement** card:
   - `PoseAnalysisPlayer` (video + skeleton overlay)
   - Empty state: "Lance la vidéo pour voir l'analyse de mouvement" (si frames.length === 0)
   - `PoseMetricsCharts` (si frames.length > 10)

### PoseFrame — add videoTime

**`apps/web/src/hooks/usePoseMetrics.ts`**

```ts
export interface PoseFrame {
  landmarks: NormalizedLandmark[];
  t: number;           // performance.now() ms — kept for internal MediaPipe use
  videoTime: number;   // NEW — video.currentTime in seconds, used for chart X axis
}
```

Update `addFrame` signature:
```ts
addFrame(landmarks: NormalizedLandmark[], timestampMs: number, videoTime: number): void
```

Internal frame construction:
```ts
const frame: PoseFrame = {
  landmarks: landmarks.map(l => ({ ...l })),
  t: timestampMs,
  videoTime,
};
```

### PoseAnalysisPlayer — pass video.currentTime

**`apps/web/src/components/PoseAnalysisPlayer.tsx`**

Update prop interface:
```ts
interface PoseAnalysisPlayerProps {
  videoUrl: string;
  onLandmarks: (landmarks: NormalizedLandmark[], timestampMs: number, videoTime: number) => void;
  onSeek?: () => void;
}
```

In the RAF loop (`startLoop`), `video` is already in scope via `videoRef.current`. Pass `video.currentTime`:
```ts
onLandmarks(result.landmarks[0], performance.now(), video.currentTime);
```

`performance.now()` is still passed to `detectForVideo` internally — `video.currentTime` is only forwarded for display.

### AnalysisResults.tsx — update handleLandmarks

`currentT` changes from ms wall-clock to video seconds. Update `handleLandmarks` and its type:

```ts
const handleLandmarks = useCallback(
  (lm: NormalizedLandmark[], ts: number, videoTime: number) => {
    addFrame(lm, ts, videoTime);
    setCurrentT(videoTime);  // now in seconds, not ms
  },
  [addFrame],
);
```

`currentT` is passed to `<PoseMetricsCharts frames={frames} currentT={currentT} />` — its unit must match what `PoseMetricsCharts` expects (seconds).

### PoseMetricsCharts — axes redesign

**`apps/web/src/components/PoseMetricsCharts.tsx`**

**Breaking change**: `polylinePoints` and `currentX` currently use `f.t` (ms). Both must be rewritten to use `f.videoTime` (seconds).

New X helpers:
```ts
const maxVideoTime = frames.length > 0 ? frames[frames.length - 1].videoTime : 0;

function xOfTime(videoTimeSec: number): number {
  if (maxVideoTime <= 0) return 0;
  return ((videoTimeSec) / maxVideoTime) * PLOT_W;  // PLOT_W = total width - left margin - right margin
}
```

Updated `polylinePoints`:
```ts
function polylinePoints(
  frames: PoseFrame[],
  getValue: (f: PoseFrame) => number,
  yMin: number, yMax: number, h: number,
  leftMargin: number,
): string {
  return frames
    .map(f => {
      const x = leftMargin + xOfTime(f.videoTime);
      const y = h - ((getValue(f) - yMin) / (yMax - yMin)) * h;
      return `${x},${y}`;
    })
    .join(' ');
}
```

**SVG layout per chart**:
```
LEFT_MARGIN  = 40   (Y axis labels)
RIGHT_MARGIN = 8
BOTTOM_MARGIN = 20  (X axis labels)
TOTAL_W = 640       (viewBox width)
PLOT_W  = 640 - 40 - 8 = 592
```

**X axis (shared, rendered inside each chart SVG)**:
- Ticks every 5s: `for t = 0; t <= maxVideoTime; t += 5`
- Label format: `M:SS` — e.g. `0:05`, `1:30`
- Cursor: vertical line from `(LEFT_MARGIN + xOfTime(currentT), 0)` to bottom of plot area
- X labels rendered at `y = plotH + 14` (below plot, inside the BOTTOM_MARGIN band)

**Y axis (per chart)**:
- Vertical line at `x = LEFT_MARGIN`
- Tick marks + labels at each Y tick value, right-aligned at `x = LEFT_MARGIN - 4`
- Horizontal dashed grid lines across PLOT_W at each Y tick

Chart 1 — **Angles coudes** (h-48 = 192px plot):
- Y range: 0–180, ticks at 0 / 45 / 90 / 135 / 180, unit label "°" in chart title
- Two lines: coude gauche (cyan `#08D9D6`) + coude droit (orange `#F39C12`)
- Legend: two colored dots + labels, top-right corner of SVG

Chart 2 — **Centre de gravité** (h-32 = 128px plot):
- Y range: 0.0–1.0, ticks at 0.0 / 0.5 / 1.0, labels "haut" / "—" / "bas"
- One smoothed line (cream `#FDFCF0`)

Chart 3 — **Équilibre bras** (h-32 = 128px plot):
- Y range: 0.0–1.0, ticks at 0.0 / 0.5 / 1.0, labels "G" / "éq" / "D"
- Background color zones rendered as SVG `<rect>` behind the line:
  - 0.0–0.4 → blue zone (left arm dominant)
  - 0.4–0.6 → green zone (balanced)
  - 0.6–1.0 → orange zone (right arm dominant)
- Note: Y=0 is rendered at the bottom of the SVG (value 0 = bottom, value 1 = top). Zone rects must be positioned accordingly: value 0.6 corresponds to `y = plotH - 0.6 * plotH`, etc.

`viewBox="0 0 640 {totalH}"` with `preserveAspectRatio="none"` for responsiveness — consistent with existing chart pattern.

---

## What is NOT changing

- DB schema — `poseData` remains `{}` (no server-side MediaPipe storage)
- `pose-math.ts` — unchanged
- Gemini scores/suggestion UI components — unchanged
- Auth, routing — unchanged

---

## Testing

- Unit: `buildPrompt(routeName)` returns string containing route name
- Unit: `parseAndValidate(text)` clamps scores 0–100, returns empty arrays for missing suggestions/highlights
- Unit: `polylinePoints` with `videoTime` X axis — frame at videoTime=0 maps to x=LEFT_MARGIN, frame at videoTime=maxVideoTime maps to x=LEFT_MARGIN+PLOT_W
- Unit: `xOfTime(0)` returns 0, `xOfTime(maxVideoTime)` returns PLOT_W
- Manual: upload a climbing video, verify Gemini response includes temporal references
- Manual: play video on results page, verify charts appear with MM:SS labels on X axis and degree/value labels on Y axis
