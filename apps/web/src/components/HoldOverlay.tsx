import { useState, useRef, useEffect, useCallback } from 'react';
import { detectHolds, DetectedHold } from '../lib/ai/hold-detection';

interface HoldOverlayProps {
  imageUrl: string;
  holdColorHex: string;
  initialHolds?: DetectedHold[];
  onHoldsChange?: (holds: DetectedHold[]) => void;
  onSave?: (holds: DetectedHold[]) => void;
  readOnly?: boolean;
}

export function HoldOverlay({
  imageUrl,
  holdColorHex,
  initialHolds,
  onHoldsChange,
  onSave,
  readOnly = false,
}: HoldOverlayProps) {
  const [holds, setHolds] = useState<DetectedHold[]>(initialHolds || []);
  const holdsRef = useRef<DetectedHold[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dragHoldId, setDragHoldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fix 2: track previous color to avoid re-running when identity changes but value is same
  const prevColorRef = useRef<string>('');
  // Fix 3: track whether a drag just occurred to suppress the ghost click
  const wasDraggingRef = useRef(false);

  useEffect(() => { holdsRef.current = holds; }, [holds]);

  const onHoldsChangeRef = useRef(onHoldsChange);
  useEffect(() => { onHoldsChangeRef.current = onHoldsChange; });

  useEffect(() => {
    if (initialHolds) setHolds(initialHolds);
  }, [initialHolds]);

  // Auto-detect holds when image loads or color *actually* changes (Fix 1 + Fix 2)
  useEffect(() => {
    if (!imageLoaded || !holdColorHex) return;
    // Fix 2: skip if color hasn't actually changed
    if (prevColorRef.current === holdColorHex && prevColorRef.current !== '') return;
    prevColorRef.current = holdColorHex;

    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    // Fix 1: removed synchronous setIsDetecting(true/false) — they were no-ops due to batching
    const detected = detectHolds(canvas, holdColorHex, 1.2);
    setHolds(detected);
    onHoldsChangeRef.current?.(detected);
  }, [imageLoaded, holdColorHex]);

  const drawImageToCanvas = useCallback((): boolean => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return false;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);
    return true;
  }, []);

  const handleDetect = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;
    setIsDetecting(true);
    try {
      if (!drawImageToCanvas()) return;
      const detected = detectHolds(canvas, holdColorHex, 1.2);
      setHolds(detected);
      onHoldsChangeRef.current?.(detected);
    } finally {
      setIsDetecting(false);
    }
  };

  const lastDragHoldsRef = useRef<DetectedHold[]>([]);

  // Fix 3: bail early if a drag just ended; the click is synthetic
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    if (readOnly) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const newHold: DetectedHold = {
      id: crypto.randomUUID(),
      x,
      y,
      radius: 0.04,
      confidence: 1,
    };
    const next = [...holdsRef.current, newHold];
    setHolds(next);
    onHoldsChange?.(next);
  };

  const handleMouseDown = (e: React.MouseEvent, holdId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const hold = holds.find(h => h.id === holdId);
    if (!hold) return;
    // Fix 3: reset drag flag on every new press
    wasDraggingRef.current = false;
    setDragHoldId(holdId);
    setDragOffset({
      x: hold.x - (e.clientX - rect.left) / rect.width,
      y: hold.y - (e.clientY - rect.top) / rect.height,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragHoldId || readOnly) return;
    // Fix 3: mark that a real drag is in progress
    wasDraggingRef.current = true;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width + dragOffset.x));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height + dragOffset.y));
    const newHolds = holdsRef.current.map(h => h.id === dragHoldId ? { ...h, x, y } : h);
    lastDragHoldsRef.current = newHolds;
    // Fix 4: update state only — onHoldsChange is called once in handleMouseUp
    setHolds(newHolds);
  };

  // Fix 4: call onHoldsChange once when drag ends, not on every pixel
  const handleMouseUp = () => {
    if (dragHoldId) {
      const finalHolds = lastDragHoldsRef.current.length > 0
        ? lastDragHoldsRef.current
        : holdsRef.current;
      onHoldsChangeRef.current?.(finalHolds);
      lastDragHoldsRef.current = [];
    }
    setDragHoldId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDetect}
            disabled={isDetecting || !imageLoaded}
            className="flex-1 btn-neo bg-hold-blue text-white text-sm disabled:opacity-50"
          >
            {isDetecting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                Détection...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Détecter automatiquement
              </span>
            )}
          </button>
          {holds.length > 0 && (
            <button
              onClick={() => {
                setHolds([]);
                onHoldsChange?.([]);
              }}
              className="px-3 py-2 border-2 border-hold-pink text-hold-pink rounded-xl font-bold text-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}
        </div>
      )}

      {/* Image with SVG overlay */}
      <div
        ref={containerRef}
        // Fix 5: no crosshair cursor in readOnly mode
        className={`relative w-full rounded-2xl overflow-hidden border-2 border-climb-dark shadow-neo ${readOnly ? '' : 'cursor-crosshair'}`}
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Route"
          className="w-full h-auto block"
          onLoad={() => setImageLoaded(true)}
          crossOrigin="anonymous"
        />
        <canvas ref={canvasRef} className="hidden" />

        {imageLoaded && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {holds.map(hold => (
              <g key={hold.id}>
                <circle
                  cx={hold.x * 100}
                  cy={hold.y * 100}
                  r={Math.max(2, hold.radius * 100 * 0.9)}
                  fill={`${holdColorHex}40`}
                  stroke={holdColorHex}
                  strokeWidth="0.6"
                  style={{ cursor: readOnly ? 'default' : 'grab' }}
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (readOnly) return;
                    const next = holdsRef.current.filter(h => h.id !== hold.id);
                    setHolds(next);
                    onHoldsChangeRef.current?.(next);
                  }}
                  onMouseDown={(e) => handleMouseDown(e as any, hold.id)}
                />
              </g>
            ))}
          </svg>
        )}

        {holds.length > 0 && (
          <div className="absolute top-2 right-2 bg-climb-dark text-white text-xs font-bold px-2 py-1 rounded-full">
            {holds.length} prise{holds.length > 1 ? 's' : ''}
          </div>
        )}

        {isDetecting && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-4 text-center border-2 border-climb-dark shadow-neo">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-hold-blue border-r-transparent mb-2" />
              <p className="text-sm font-bold text-climb-dark">Analyse en cours...</p>
            </div>
          </div>
        )}
      </div>

      {/* Fix 6: gate hint text on imageLoaded */}
      {!readOnly && imageLoaded && (
        <p className="text-xs text-climb-dark/60 text-center font-medium">
          Clic gauche pour ajouter · Clic droit pour supprimer · Glisser pour déplacer
        </p>
      )}

      {!readOnly && onSave && (
        <button
          onClick={() => onSave(holds)}
          className="w-full btn-neo bg-hold-green text-white"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">save</span>
            Sauvegarder ({holds.length} prise{holds.length > 1 ? 's' : ''})
          </span>
        </button>
      )}
    </div>
  );
}
