import { useState } from 'react';

interface HoldColorFilterProps {
  selectedColors: string[];
  onColorsChange: (colors: string[]) => void;
}

interface ColorConfig {
  name: string;
  category: string;
  hex: string;
}

const HOLD_COLORS: ColorConfig[] = [
  { name: 'Rouge', category: 'red', hex: '#ef4444' },
  { name: 'Bleu', category: 'blue', hex: '#3b82f6' },
  { name: 'Vert', category: 'green', hex: '#22c55e' },
  { name: 'Jaune', category: 'yellow', hex: '#eab308' },
  { name: 'Orange', category: 'orange', hex: '#f97316' },
  { name: 'Violet', category: 'purple', hex: '#a855f7' },
  { name: 'Rose', category: 'pink', hex: '#ec4899' },
  { name: 'Noir', category: 'black', hex: '#1f2937' },
  { name: 'Blanc', category: 'white', hex: '#f3f4f6' },
  { name: 'Gris', category: 'grey', hex: '#6b7280' },
];

export const HoldColorFilter = ({
  selectedColors,
  onColorsChange,
}: HoldColorFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleColor = (category: string) => {
    if (selectedColors.includes(category)) {
      onColorsChange(selectedColors.filter((c) => c !== category));
    } else {
      onColorsChange([...selectedColors, category]);
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
          <div className="w-8 h-8 rounded-xl bg-hold-purple flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-white">
              palette
            </span>
          </div>
          <span className="text-sm font-extrabold text-climb-dark">
            Couleurs des prises
          </span>
          {selectedColors.length > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-purple text-white">
              {selectedColors.length}
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
          <div className="grid grid-cols-5 gap-3">
            {HOLD_COLORS.map((color) => {
              const isSelected = selectedColors.includes(color.category);
              return (
                <button
                  key={color.category}
                  onClick={() => handleToggleColor(color.category)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-cream"
                  title={color.name}
                >
                  <div
                    className={`w-10 h-10 rounded-xl transition-all border-2 ${
                      isSelected
                        ? 'border-climb-dark shadow-neo-sm scale-110'
                        : 'border-climb-dark/20'
                    }`}
                    style={{
                      backgroundColor: color.hex,
                    }}
                  />
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-climb-dark' : 'text-climb-dark/50'}`}>
                    {color.name}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedColors.length > 0 && (
            <button
              onClick={() => onColorsChange([])}
              className="mt-3 w-full text-[11px] font-bold text-hold-pink hover:text-hold-pink/80 py-1 border-t border-climb-dark/10 pt-3"
            >
              Réinitialiser les couleurs
            </button>
          )}
        </div>
      )}
    </div>
  );
};
