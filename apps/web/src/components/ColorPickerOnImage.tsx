import { useState, useRef, useEffect, useCallback } from 'react';
import { HoldColorIndicator } from './HoldColorIndicator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ColorPickerOnImageProps {
  imageUrl: string;
  onColorSelect: (hexColor: string) => void;
  selectedColor?: string;
  colorCategory?: string;
}

const ZOOM_LEVEL = 6;
const LOUPE_SIZE = 140;

const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

export const ColorPickerOnImage = ({
  imageUrl,
  onColorSelect,
  selectedColor,
  colorCategory,
}: ColorPickerOnImageProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [color, setColor] = useState<string>(selectedColor || '');
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [showLoupe, setShowLoupe] = useState(false);
  const [loupePosition, setLoupePosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setColor(selectedColor || '');

    if (!canvasRef.current || !imageRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    let objectUrl: string | null = null;

    const loadImageAsBlob = async () => {
      try {
        const proxyUrl = `${API_URL}/api/image/proxy?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl, { credentials: 'include' });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
          try {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx?.drawImage(img, 0, 0);
            setImageLoaded(true);
            setImageError(false);
          } catch (err) {
            console.error('Error drawing image on canvas:', err);
            setImageError(true);
            setImageLoaded(false);
          }
        };

        img.onerror = () => {
          console.error('Failed to load blob image');
          setImageError(true);
          setImageLoaded(false);
        };

        img.src = objectUrl;
      } catch (err) {
        console.error('Error loading image:', err);
        setImageError(true);
        setImageLoaded(false);
      }
    };

    loadImageAsBlob();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl, selectedColor]);

  const getColorAtPosition = useCallback((imageX: number, imageY: number): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '#000000';

    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';

    const pixel = ctx.getImageData(Math.floor(imageX), Math.floor(imageY), 1, 1).data;
    return `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
      .toString(16)
      .slice(1)
      .toUpperCase()}`;
  }, []);

  const drawLoupe = useCallback((imageX: number, imageY: number) => {
    const canvas = canvasRef.current;
    const loupe = loupeRef.current;
    if (!canvas || !loupe) return;

    const loupeCtx = loupe.getContext('2d');
    if (!loupeCtx) return;

    loupeCtx.fillStyle = '#1a1a1a';
    loupeCtx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

    const sourceSize = LOUPE_SIZE / ZOOM_LEVEL;
    const sourceX = imageX - sourceSize / 2;
    const sourceY = imageY - sourceSize / 2;

    loupeCtx.imageSmoothingEnabled = false;
    loupeCtx.drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      LOUPE_SIZE,
      LOUPE_SIZE
    );

    const center = LOUPE_SIZE / 2;

    loupeCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    loupeCtx.lineWidth = 3;
    loupeCtx.beginPath();
    loupeCtx.moveTo(center - 15, center);
    loupeCtx.lineTo(center - 5, center);
    loupeCtx.moveTo(center + 5, center);
    loupeCtx.lineTo(center + 15, center);
    loupeCtx.moveTo(center, center - 15);
    loupeCtx.lineTo(center, center - 5);
    loupeCtx.moveTo(center, center + 5);
    loupeCtx.lineTo(center, center + 15);
    loupeCtx.stroke();

    loupeCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    loupeCtx.lineWidth = 1;
    loupeCtx.beginPath();
    loupeCtx.moveTo(center - 15, center);
    loupeCtx.lineTo(center - 5, center);
    loupeCtx.moveTo(center + 5, center);
    loupeCtx.lineTo(center + 15, center);
    loupeCtx.moveTo(center, center - 15);
    loupeCtx.lineTo(center, center - 5);
    loupeCtx.moveTo(center, center + 5);
    loupeCtx.lineTo(center, center + 15);
    loupeCtx.stroke();

    loupeCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    loupeCtx.beginPath();
    loupeCtx.arc(center, center, 2, 0, Math.PI * 2);
    loupeCtx.fill();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageLoaded) return;

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const imageX = mouseX * scaleX;
    const imageY = mouseY * scaleY;

    const loupeX = e.clientX - containerRect.left - LOUPE_SIZE / 2;
    const loupeY = mouseY > LOUPE_SIZE + 30
      ? e.clientY - containerRect.top - LOUPE_SIZE - 25
      : e.clientY - containerRect.top + 25;

    setLoupePosition({ x: loupeX, y: loupeY });
    setShowLoupe(true);

    drawLoupe(imageX, imageY);

    const hex = getColorAtPosition(imageX, imageY);
    setHoverColor(hex);
  }, [imageLoaded, drawLoupe, getColorAtPosition]);

  const handleMouseLeave = useCallback(() => {
    setShowLoupe(false);
    setHoverColor(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const imageX = (e.clientX - rect.left) * scaleX;
    const imageY = (e.clientY - rect.top) * scaleY;

    const hex = getColorAtPosition(imageX, imageY);
    setColor(hex);
    onColorSelect(hex);
  }, [imageLoaded, getColorAtPosition, onColorSelect]);

  return (
    <div className="color-picker-on-image">
      <p className="text-sm font-extrabold text-climb-dark mb-2">
        Couleur physique des prises *
      </p>
      <p className="text-xs text-climb-dark/50 mb-3 font-bold">
        Cliquez sur une prise dans l'image pour detecter sa couleur reelle
      </p>

      {imageError && (
        <div className="p-4 bg-hold-pink/10 border-2 border-hold-pink/30 rounded-xl text-hold-pink text-sm mb-3 font-bold">
          Erreur lors du chargement de l'image. Veuillez reessayer.
        </div>
      )}

      <div ref={containerRef} className="relative inline-block w-full">
        <img
          ref={imageRef}
          alt="Route"
          className="hidden"
          crossOrigin="anonymous"
        />

        {!imageLoaded && !imageError && (
          <div className="flex items-center justify-center h-64 bg-cream rounded-xl border-2 border-climb-dark/20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-climb-dark mx-auto mb-3"></div>
              <p className="text-sm text-climb-dark/60 font-bold">Chargement de l'image...</p>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`max-w-full border-2 rounded-xl transition-opacity ${
            imageLoaded
              ? 'cursor-crosshair border-climb-dark/30 opacity-100'
              : 'opacity-0 border-climb-dark/20 pointer-events-none'
          }`}
          style={{ maxHeight: '500px', display: imageLoaded ? 'block' : 'none' }}
        />

        {color && imageLoaded && (
          <div className="absolute top-4 right-4 pointer-events-none">
            <HoldColorIndicator holdColorHex={color} size={80} className="drop-shadow-xl" />
          </div>
        )}

        {showLoupe && imageLoaded && (
          <div
            className="absolute pointer-events-none z-50 flex flex-col items-center"
            style={{
              left: loupePosition.x,
              top: loupePosition.y,
            }}
          >
            <canvas
              ref={loupeRef}
              width={LOUPE_SIZE}
              height={LOUPE_SIZE}
              className="rounded-full border-4 border-white"
              style={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 2px #333',
              }}
            />
            {hoverColor && (
              <div
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold"
                style={{
                  backgroundColor: hoverColor,
                  color: isLightColor(hoverColor) ? '#000' : '#fff',
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {hoverColor}
              </div>
            )}
          </div>
        )}
      </div>

      {color && (
        <div className="mt-4 flex items-center gap-3 p-3 bg-cream rounded-xl border-2 border-climb-dark/20">
          <HoldColorIndicator holdColorHex={color} size={64} />
          <div className="flex-1">
            <p className="text-xs font-bold text-climb-dark/50 uppercase tracking-wider">
              Couleur selectionnee
            </p>
            <p className="text-lg font-mono font-bold text-climb-dark">
              {color}
            </p>
            {colorCategory && (
              <p className="text-xs text-climb-dark/60 mt-1 font-bold">
                Categorie: <span className="font-extrabold capitalize">{colorCategory}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
