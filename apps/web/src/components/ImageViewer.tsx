import { useState, useEffect, useRef } from 'react';

interface ImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewer = ({ imageUrl, isOpen, onClose }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#FF0000');
  const [drawWidth, setDrawWidth] = useState(3);
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setDrawMode(false);
      clearCanvas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  useEffect(() => {
    if (!canvasRef.current || !imgRef.current || !isOpen) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;

    const handleImageLoad = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
    };

    if (img.complete) {
      handleImageLoad();
    } else {
      img.addEventListener('load', handleImageLoad);
      return () => img.removeEventListener('load', handleImageLoad);
    }
  }, [imageUrl, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(0.5, prev + delta), 5));
  };

  const getCanvasCoordinates = (e: React.MouseEvent | React.Touch) => {
    if (!canvasRef.current || !imgRef.current) return null;

    const canvas = canvasRef.current;
    const img = imgRef.current;
    const imgRect = img.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    const canvasX = (x / imgRect.width) * canvas.width;
    const canvasY = (y / imgRect.height) * canvas.height;

    return { x: canvasX, y: canvasY };
  };

  const startDrawing = (e: React.MouseEvent | React.Touch) => {
    if (!drawMode) return;
    setIsDrawingPath(true);

    const coords = getCanvasCoordinates(e);
    if (!coords || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent | React.Touch) => {
    if (!isDrawingPath || !drawMode) return;

    const coords = getCanvasCoordinates(e);
    if (!coords || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingPath(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawMode) {
      e.preventDefault();
      startDrawing(e);
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawMode) {
      if (isDrawingPath) {
        e.preventDefault();
        draw(e);
      }
    } else if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (drawMode) {
      stopDrawing();
    } else {
      setIsDragging(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (drawMode) {
        e.preventDefault();
        startDrawing(e.touches[0]);
      } else {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (drawMode && isDrawingPath) {
        e.preventDefault();
        draw(e.touches[0]);
      } else if (isDragging) {
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    if (drawMode) {
      stopDrawing();
    } else {
      setIsDragging(false);
    }
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.5, 5));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.5, 0.5));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors"
      >
        <span className="material-symbols-outlined text-[28px]">close</span>
      </button>

      {/* Drawing tools */}
      <div className="absolute top-4 left-4 z-[101] flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDrawMode(!drawMode);
          }}
          className={`w-12 h-12 rounded-full backdrop-blur-md text-white flex items-center justify-center transition-colors ${
            drawMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'
          }`}
          title={drawMode ? 'Desactiver le dessin' : 'Activer le dessin'}
        >
          <span className="material-symbols-outlined text-[28px]">edit</span>
        </button>

        {drawMode && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCanvas();
              }}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors"
              title="Effacer tout"
            >
              <span className="material-symbols-outlined text-[28px]">delete</span>
            </button>

            <div className="flex flex-col gap-1 bg-white/10 backdrop-blur-md rounded-full p-2">
              {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#FFFFFF'].map((color) => (
                <button
                  key={color}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawColor(color);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    drawColor === color ? 'border-white scale-110' : 'border-white/30'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Couleur: ${color}`}
                />
              ))}
            </div>

            <div className="flex flex-col gap-1 bg-white/10 backdrop-blur-md rounded-full p-2">
              {[2, 4, 6, 8].map((width) => (
                <button
                  key={width}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawWidth(width);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    drawWidth === width ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={`Epaisseur: ${width}px`}
                >
                  <div
                    className="rounded-full bg-white"
                    style={{ width: `${width * 2}px`, height: `${width * 2}px` }}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[101] flex gap-2 bg-white/10 backdrop-blur-md rounded-full p-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoomOut();
          }}
          disabled={scale <= 0.5}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[24px]">zoom_out</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-xs font-bold"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoomIn();
          }}
          disabled={scale >= 5}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[24px]">zoom_in</span>
        </button>
      </div>

      {/* Image container */}
      <div
        ref={imageRef}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative max-w-[90vw] max-h-[90vh] overflow-hidden"
        style={{
          cursor: drawMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'),
        }}
      >
        <div className="relative">
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Full size"
            className="max-w-none select-none block"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full text-center">
        {drawMode ? 'Mode dessin active - Cliquez pour dessiner' : 'Glissez pour deplacer - Molette pour zoomer'}
      </div>
    </div>
  );
};
