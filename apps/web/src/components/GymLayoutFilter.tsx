import { useEffect, useRef, useState } from 'react';
import { DEFAULT_GYM_SVG } from '../lib/defaultGymLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface GymLayoutFilterProps {
  selectedSectors: string[];
  onSectorsChange: (sectors: string[]) => void;
}

export const GymLayoutFilter = ({
  selectedSectors,
  onSectorsChange,
}: GymLayoutFilterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>(DEFAULT_GYM_SVG);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load SVG from API or use default
    const loadSVG = async () => {
      try {
        const response = await fetch(`${API_URL}/api/gym-layout/active`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSvgContent(data.svgContent || DEFAULT_GYM_SVG);
        } else {
          setSvgContent(DEFAULT_GYM_SVG);
        }
      } catch (error) {
        setSvgContent(DEFAULT_GYM_SVG);
      }
    };

    loadSVG();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !svgContent || !isOpen) return;

    // Insert SVG
    containerRef.current.innerHTML = svgContent;

    // Get the SVG element and set dimensions
    const svgElement = containerRef.current.querySelector('svg');

    if (svgElement) {
      // Force SVG to fill the container
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.style.display = 'block';

      // Preserve aspect ratio while fitting in container
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // If no viewBox is set, calculate it from width/height attributes
      if (!svgElement.hasAttribute('viewBox')) {
        const width = svgElement.getAttribute('width') || '400';
        const height = svgElement.getAttribute('height') || '200';
        // Remove % or other units
        const w = parseFloat(width.toString());
        const h = parseFloat(height.toString());
        svgElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    // Get all sector paths and zones
    const sectorElements = containerRef.current.querySelectorAll('.sector-path, .sector-zone');

    // Apply styles and click handlers
    sectorElements.forEach((element) => {
      const sectorId = element.getAttribute('data-sector');
      if (!sectorId) return;

      const isSelected = selectedSectors.includes(sectorId);

      // Apply selection styles
      applyStyles(element as SVGElement, isSelected);

      // Add click handler
      element.addEventListener('click', () => {
        const newSelectedSectors = isSelected
          ? selectedSectors.filter((s) => s !== sectorId)
          : [...selectedSectors, sectorId];

        onSectorsChange(newSelectedSectors);
      });
    });
  }, [svgContent, selectedSectors, onSectorsChange, isOpen]);

  const applyStyles = (element: SVGElement, isSelected: boolean) => {
    if (isSelected) {
      // Selected state - thicker stroke for visibility
      element.style.stroke = '#252A34';
      element.style.strokeWidth = '3';
      element.style.fillOpacity = '0.9';
    } else {
      // Unselected state - gray with low opacity and thinner stroke
      element.style.stroke = '#9ca3af';
      element.style.strokeWidth = '1';
      element.style.fillOpacity = '0.3';
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border-2 border-climb-dark shadow-neo overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-hold-blue flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-white">
              map
            </span>
          </div>
          <span className="text-sm font-extrabold text-climb-dark">
            Plan de la salle
          </span>
          {selectedSectors.length > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-blue text-white">
              {selectedSectors.length}
            </span>
          )}
        </div>
        <span className={`material-symbols-outlined text-[20px] text-climb-dark transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Content - Collapsible */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t-2 border-climb-dark/10">
          <div className="text-[10px] font-bold text-climb-dark/50 mb-2">
            Cliquez sur une zone pour filtrer
          </div>
          <div
            className="overflow-hidden rounded-xl bg-cream border-2 border-climb-dark/20"
            style={{ width: '100%', maxWidth: '400px', height: '200px' }}
          >
            <div
              ref={containerRef}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          {selectedSectors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSectors.map((sector) => (
                <span
                  key={sector}
                  className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-hold-blue text-white border-2 border-climb-dark"
                >
                  {sector}
                </span>
              ))}
              <button
                onClick={() => onSectorsChange([])}
                className="text-[10px] font-bold text-hold-pink hover:text-hold-pink/80 px-2"
              >
                Effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
