import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Selectionner...',
  label,
  className = '',
  disabled = false,
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, onChange]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, options, value]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-extrabold text-climb-dark mb-2">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          px-4 py-3 bg-cream border-2 border-climb-dark/20 rounded-xl
          text-left font-bold transition-all
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-climb-dark/40 focus:outline-none focus:border-climb-dark'
          }
          ${isOpen ? 'border-climb-dark' : ''}
        `}
      >
        <span className={`flex items-center gap-2 ${!selectedOption ? 'text-climb-dark/40' : 'text-climb-dark'}`}>
          {selectedOption?.color && (
            <span
              className="w-4 h-4 rounded-full border border-climb-dark/20"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          {selectedOption?.label || placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-[20px] text-climb-dark/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-2 py-2 bg-cream border-2 border-climb-dark rounded-xl shadow-neo-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors
                ${option.value === value
                  ? 'bg-hold-blue text-white'
                  : highlightedIndex === index
                    ? 'bg-climb-dark/10 text-climb-dark'
                    : 'text-climb-dark hover:bg-climb-dark/10'
                }
              `}
            >
              {option.color && (
                <span
                  className="w-4 h-4 rounded-full border border-climb-dark/30"
                  style={{ backgroundColor: option.color }}
                />
              )}
              <span className="font-bold">{option.label}</span>
              {option.value === value && (
                <span className="material-symbols-outlined text-[18px] ml-auto">check</span>
              )}
            </div>
          ))}

          {options.length === 0 && (
            <div className="px-4 py-2 text-climb-dark/50 text-sm font-bold">
              Aucune option disponible
            </div>
          )}
        </div>
      )}
    </div>
  );
};
