import { useState } from 'react';

interface GradeFilterProps {
  selectedGrades: string[];
  onGradesChange: (grades: string[]) => void;
}

interface DifficultyColor {
  name: string;
  hex: string;
}

// Difficulty colors for the gym (must match backend DifficultyColor enum)
const DIFFICULTY_COLORS: DifficultyColor[] = [
  { name: 'Vert clair', hex: '#86efac' },
  { name: 'Vert', hex: '#22c55e' },
  { name: 'Bleu clair', hex: '#7dd3fc' },
  { name: 'Bleu foncé', hex: '#3b82f6' },
  { name: 'Violet', hex: '#a855f7' },
  { name: 'Rose', hex: '#ec4899' },
  { name: 'Rouge', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Jaune', hex: '#eab308' },
  { name: 'Blanc', hex: '#e5e7eb' },
  { name: 'Gris', hex: '#6b7280' },
  { name: 'Noir', hex: '#1f2937' },
];

export const GradeFilter = ({
  selectedGrades,
  onGradesChange,
}: GradeFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleColor = (colorName: string) => {
    if (selectedGrades.includes(colorName)) {
      onGradesChange(selectedGrades.filter((g) => g !== colorName));
    } else {
      onGradesChange([...selectedGrades, colorName]);
    }
  };

  const selectedCount = selectedGrades.length;

  return (
    <div className="w-full bg-white rounded-2xl border-2 border-climb-dark shadow-neo overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-hold-orange flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-white">
              trending_up
            </span>
          </div>
          <span className="text-sm font-extrabold text-climb-dark">
            Niveaux
          </span>
          {selectedCount > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-orange text-white">
              {selectedCount}
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
          <div className="flex flex-wrap gap-2 justify-center">
            {DIFFICULTY_COLORS.map((color) => {
              const isSelected = selectedGrades.includes(color.name);
              const isLightColor = ['#86efac', '#7dd3fc', '#e5e7eb', '#eab308'].includes(color.hex);

              return (
                <button
                  key={color.name}
                  onClick={() => handleToggleColor(color.name)}
                  style={{ backgroundColor: color.hex }}
                  className={`w-11 h-11 rounded-xl transition-all border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-climb-dark shadow-neo-sm scale-110'
                      : 'border-climb-dark/20 hover:border-climb-dark/40 opacity-50 hover:opacity-100'
                  }`}
                  title={color.name}
                >
                  {isSelected && (
                    <span
                      className={`material-symbols-outlined text-[18px] fill-1 ${isLightColor ? 'text-climb-dark' : 'text-white'}`}
                    >
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedCount > 0 && (
            <button
              onClick={() => onGradesChange([])}
              className="mt-3 w-full text-[11px] font-bold text-hold-pink hover:text-hold-pink/80 py-1 border-t border-climb-dark/10 pt-3"
            >
              Réinitialiser les niveaux
            </button>
          )}
        </div>
      )}
    </div>
  );
};
