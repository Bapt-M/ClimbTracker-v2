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
      '/mediapipe/wasm',
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
