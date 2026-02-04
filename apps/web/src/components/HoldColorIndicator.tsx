import { useMemo } from 'react';

interface HoldColorIndicatorProps {
  holdColorHex: string;
  size?: number;
  className?: string;
}

/**
 * Generate lighter and darker variations of a hex color
 */
function generateColorVariations(hex: string): { light: string; medium: string; dark: string; darker: string } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Light version (30% lighter)
  const lightR = Math.min(255, Math.round(r + (255 - r) * 0.3));
  const lightG = Math.min(255, Math.round(g + (255 - g) * 0.3));
  const lightB = Math.min(255, Math.round(b + (255 - b) * 0.3));

  // Medium version (original color)
  const medR = r;
  const medG = g;
  const medB = b;

  // Dark version (40% darker)
  const darkR = Math.round(r * 0.6);
  const darkG = Math.round(g * 0.6);
  const darkB = Math.round(b * 0.6);

  // Darker version (60% darker for stroke)
  const darkerR = Math.round(r * 0.4);
  const darkerG = Math.round(g * 0.4);
  const darkerB = Math.round(b * 0.4);

  return {
    light: `rgb(${lightR}, ${lightG}, ${lightB})`,
    medium: `rgb(${medR}, ${medG}, ${medB})`,
    dark: `rgb(${darkR}, ${darkG}, ${darkB})`,
    darker: `rgb(${darkerR}, ${darkerG}, ${darkerB})`,
  };
}

export const HoldColorIndicator = ({ holdColorHex, size = 80, className = '' }: HoldColorIndicatorProps) => {
  const colors = useMemo(() => generateColorVariations(holdColorHex), [holdColorHex]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Radial gradient for volume (3D effect) */}
        <radialGradient id={`gradVolume-${holdColorHex}`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" style={{ stopColor: colors.light, stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: colors.medium, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: colors.dark, stopOpacity: 1 }} />
        </radialGradient>

        {/* Gradient for screw hole (depth) */}
        <radialGradient id={`gradHole-${holdColorHex}`} cx="50%" cy="50%" r="50%">
          <stop offset="70%" style={{ stopColor: '#374151', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#111827', stopOpacity: 1 }} />
        </radialGradient>

        {/* Noise filter to simulate grainy hold texture */}
        <filter id={`textureNoise-${holdColorHex}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0"
            in="noise"
            result="coloredNoise"
          />
          <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
          <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
        </filter>

        {/* Light drop shadow */}
        <filter id={`dropShadow-${holdColorHex}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="2" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main group with drop shadow */}
      <g filter={`url(#dropShadow-${holdColorHex})`}>
        {/* Main hold shape (organic) */}
        <path
          d="M 50 10 Q 80 10 85 35 Q 95 60 75 80 Q 50 95 25 80 Q 5 60 15 35 Q 25 10 50 10 Z"
          fill={`url(#gradVolume-${holdColorHex})`}
          stroke={colors.darker}
          strokeWidth="1"
          filter={`url(#textureNoise-${holdColorHex})`}
        />

        {/* Relief zones / Facets (for sculpted look) */}
        <path d="M 50 10 Q 65 20 70 40 Q 50 50 30 40 Q 35 20 50 10" fill="#ffffff" opacity="0.2" />

        {/* Bolt hole */}
        <g transform="translate(50, 50)">
          {/* The hole recess */}
          <circle cx="0" cy="0" r="8" fill={`url(#gradHole-${holdColorHex})`} stroke="#b45309" strokeWidth="1" />

          {/* Hexagonal bolt inside */}
          <path d="M -3 -5 L 3 -5 L 6 0 L 3 5 L -3 5 L -6 0 Z" fill="#9ca3af" stroke="#4b5563" strokeWidth="0.5" />
          {/* Bolt slot detail */}
          <circle cx="0" cy="0" r="2" fill="#374151" />
        </g>

        {/* Direction marker (optional small indicator line) */}
        <path d="M 50 20 L 50 25" stroke={colors.darker} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
};
