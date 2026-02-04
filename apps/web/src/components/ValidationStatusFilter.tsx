import { useState } from 'react';
import { ValidationStatus } from './QuickStatusMenu';

interface ValidationStatusFilterProps {
  selectedStatuses: ValidationStatus[];
  onStatusesChange: (statuses: ValidationStatus[]) => void;
  showFlashedFilter?: boolean;
  showFavoriteFilter?: boolean;
  isFlashedOnly?: boolean;
  isFavoriteOnly?: boolean;
  onFlashedChange?: (value: boolean) => void;
  onFavoriteChange?: (value: boolean) => void;
}

const STATUS_CONFIG: Record<ValidationStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  [ValidationStatus.EN_PROJET]: {
    label: 'En projet',
    color: '#FF8C00',
    bgColor: 'rgba(255, 140, 0, 0.15)',
    icon: 'schedule',
  },
  [ValidationStatus.VALIDE]: {
    label: 'Validées',
    color: '#2ECC71',
    bgColor: 'rgba(46, 204, 113, 0.15)',
    icon: 'check_circle',
  },
};

export const ValidationStatusFilter = ({
  selectedStatuses,
  onStatusesChange,
  showFlashedFilter = false,
  showFavoriteFilter = false,
  isFlashedOnly = false,
  isFavoriteOnly = false,
  onFlashedChange,
  onFavoriteChange,
}: ValidationStatusFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleStatus = (status: ValidationStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const activeFiltersCount =
    selectedStatuses.length +
    (isFlashedOnly ? 1 : 0) +
    (isFavoriteOnly ? 1 : 0);

  return (
    <div className="w-full bg-white rounded-2xl border-2 border-climb-dark shadow-neo overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-hold-green flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-white">
              task_alt
            </span>
          </div>
          <span className="text-sm font-extrabold text-climb-dark">
            Mes voies
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-green text-white">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <span className={`material-symbols-outlined text-[20px] text-climb-dark transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Content - Collapsible */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t-2 border-climb-dark/10 space-y-3">
          {/* Status Filters */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const isSelected = selectedStatuses.includes(status as ValidationStatus);
              return (
                <button
                  key={status}
                  onClick={() => handleToggleStatus(status as ValidationStatus)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all border-2 ${
                    isSelected
                      ? 'border-climb-dark shadow-neo-sm'
                      : 'border-climb-dark/20 hover:border-climb-dark/40'
                  }`}
                  style={{
                    backgroundColor: isSelected ? config.color : config.bgColor,
                    color: isSelected ? 'white' : config.color,
                  }}
                >
                  <span className="material-symbols-outlined text-[18px] fill-1">{config.icon}</span>
                  <span className="text-[12px] font-extrabold">{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Additional Filters */}
          {(showFlashedFilter || showFavoriteFilter) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t-2 border-climb-dark/10">
              {showFlashedFilter && (
                <button
                  onClick={() => onFlashedChange?.(!isFlashedOnly)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all border-2 ${
                    isFlashedOnly
                      ? 'bg-hold-yellow text-climb-dark border-climb-dark shadow-neo-sm'
                      : 'bg-hold-yellow/15 text-hold-yellow border-climb-dark/20 hover:border-climb-dark/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] fill-1">bolt</span>
                  <span className="text-[12px] font-extrabold">Flash</span>
                </button>
              )}

              {showFavoriteFilter && (
                <button
                  onClick={() => onFavoriteChange?.(!isFavoriteOnly)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all border-2 ${
                    isFavoriteOnly
                      ? 'bg-hold-pink text-white border-climb-dark shadow-neo-sm'
                      : 'bg-hold-pink/15 text-hold-pink border-climb-dark/20 hover:border-climb-dark/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] fill-1">favorite</span>
                  <span className="text-[12px] font-extrabold">Favorites</span>
                </button>
              )}
            </div>
          )}

          {/* Reset Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                onStatusesChange([]);
                onFlashedChange?.(false);
                onFavoriteChange?.(false);
              }}
              className="w-full text-[11px] font-bold text-hold-pink hover:text-hold-pink/80 py-1 border-t border-climb-dark/10 pt-3"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
};
