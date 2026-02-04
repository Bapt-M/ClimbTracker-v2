import { useState, useEffect, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MiniGymLayoutProps {
  sector: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const MiniGymLayout = ({ sector, className = '', size = 'md' }: MiniGymLayoutProps) => {
  const [rawSvg, setRawSvg] = useState<string>('');

  // Load SVG from API only once
  useEffect(() => {
    const loadSVG = async () => {
      try {
        const response = await fetch(`${API_URL}/api/gym-layout/active`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setRawSvg(data.svgContent);
        }
      } catch (error) {
        console.error('Failed to load gym layout:', error);
      }
    };

    loadSVG();
  }, []);

  // Process SVG with styles whenever sector changes
  const svgContent = useMemo(() => {
    if (!rawSvg) return '';

    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(rawSvg, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');

      if (!svgElement) return '';

      // Define colors (always light mode)
      const strokeColor = '#000000';

      // Replace the <style> tag with styles
      const styleTag = svgElement.querySelector('style');
      if (styleTag) {
        styleTag.textContent = `
          .sector-path {
              fill: none;
              stroke: ${strokeColor};
              stroke-width: 0.75;
              stroke-linecap: round;
              stroke-linejoin: round;
              transition: all 0.2s ease;
              cursor: pointer;
              opacity: 1;
          }

          .sector-zone {
              fill: rgba(203, 213, 225, 0.1);
              stroke: ${strokeColor};
              stroke-width: 0.5;
              cursor: pointer;
              transition: all 0.2s ease;
          }

          .sector-label {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
              font-size: 4px;
              font-weight: 700;
              fill: ${strokeColor};
              pointer-events: none;
              user-select: none;
              opacity: 0.3;
          }
        `;
      }

      // Find all sector elements and highlight the selected one
      const sectorElements = svgElement.querySelectorAll('.sector-path, .sector-zone');

      sectorElements.forEach((element) => {
        const dataSector = element.getAttribute('data-sector');
        if (dataSector === sector) {
          // Highlight the selected sector with inline styles (higher priority)
          element.setAttribute('style', `stroke: ${strokeColor} !important; stroke-width: 2 !important; opacity: 1 !important; fill-opacity: 0.8 !important;`);
        } else {
          // Reset style for non-selected sectors
          element.removeAttribute('style');
        }
      });

      // Serialize modified SVG
      const serializer = new XMLSerializer();
      return serializer.serializeToString(svgElement);
    } catch (error) {
      console.error('Failed to process SVG:', error);
      return '';
    }
  }, [rawSvg, sector]);

  const sizeClasses = size === 'sm' ? 'w-8 h-10' : 'w-16 h-20';

  return (
    <div
      className={`relative group inline-block ${className}`}
      title={sector}
    >
      {/* Mini SVG */}
      <div
        className={`${sizeClasses} overflow-hidden flex-shrink-0`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{
          display: 'inline-block',
        }}
      />
    </div>
  );
};
