import { useState, useEffect, useRef } from 'react';
import { DEFAULT_GYM_SVG } from '../lib/defaultGymLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface GymLayoutSelectorProps {
  onSectorSelect: (sector: string) => void;
  selectedSector?: string;
  className?: string;
}

export const GymLayoutSelector = ({
  onSectorSelect,
  selectedSector,
  className = '',
}: GymLayoutSelectorProps) => {
  const [svgContent, setSvgContent] = useState<string>(DEFAULT_GYM_SVG);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGymLayout = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/gym-layout/active`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.svgContent) {
            setSvgContent(data.svgContent);
          } else {
            setSvgContent(DEFAULT_GYM_SVG);
          }
        } else {
          setSvgContent(DEFAULT_GYM_SVG);
        }
      } catch (err) {
        setSvgContent(DEFAULT_GYM_SVG);
      } finally {
        setLoading(false);
      }
    };

    fetchGymLayout();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const svgElement = container.querySelector('svg');

    if (svgElement) {
      svgElement.style.width = '100%';
      svgElement.style.height = 'auto';
      svgElement.style.maxHeight = '400px';
      svgElement.style.display = 'block';
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    const sectorPaths = container.querySelectorAll('.sector-path, .sector-zone');

    const handleClick = (e: Event) => {
      const target = e.currentTarget as SVGElement;
      const sector = target.getAttribute('data-sector');
      if (sector) {
        onSectorSelect(sector);
      }
    };

    sectorPaths.forEach((path) => {
      path.addEventListener('click', handleClick);
    });

    return () => {
      sectorPaths.forEach((path) => {
        path.removeEventListener('click', handleClick);
      });
    };
  }, [svgContent, onSectorSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const sectorElements = container.querySelectorAll('.sector-path, .sector-zone');

    sectorElements.forEach((element) => {
      const svgElement = element as SVGElement;
      const sector = svgElement.getAttribute('data-sector');

      if (sector === selectedSector) {
        svgElement.style.stroke = '#000000';
        svgElement.style.strokeWidth = '2';
        svgElement.style.fillOpacity = '0.9';
      } else {
        svgElement.style.stroke = '#d1d5db';
        svgElement.style.strokeWidth = '1';
        svgElement.style.fillOpacity = '0.4';
      }
    });
  }, [selectedSector, svgContent]);

  if (loading) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="text-climb-dark/60 font-bold">
          Chargement du plan...
        </div>
      </div>
    );
  }

  return (
    <div className={`gym-layout-selector ${className}`}>
      <label className="block text-sm font-extrabold text-climb-dark mb-2">
        Selectionnez le secteur sur le plan :
      </label>

      <div
        ref={containerRef}
        className="border-2 border-climb-dark/20 rounded-xl p-4 bg-white overflow-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {selectedSector && (
        <div className="mt-3 text-sm text-climb-dark/70 font-bold">
          Secteur selectionne :{' '}
          <span className="font-extrabold text-climb-dark">
            {selectedSector}
          </span>
        </div>
      )}
    </div>
  );
};
