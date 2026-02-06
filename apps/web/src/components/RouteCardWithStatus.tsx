import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route } from '../lib/api';
import { QuickStatusMenu, ValidationStatus } from './QuickStatusMenu';
import { MiniGymLayout } from './MiniGymLayout';
import { HoldColorIndicator } from './HoldColorIndicator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ValidationData {
  id: string;
  status: ValidationStatus;
  attempts: number;
  isFlashed: boolean;
  isFavorite: boolean;
}

interface RouteCardWithStatusProps {
  route: Route;
  viewMode?: 'list' | 'grid';
  onStatusChange?: () => void;
  initialValidation?: ValidationData;
}

const RouteCardWithStatusComponent = ({ route, viewMode = 'list', onStatusChange, initialValidation }: RouteCardWithStatusProps) => {
  const navigate = useNavigate();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  // Track local overrides during optimistic updates
  const [localOverride, setLocalOverride] = useState<{ cleared: boolean } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartTime = useRef<number>(0);

  // Derive currentValidation from props, with local override support
  // Local override is cleared when parent data updates (initialValidation changes)
  const prevInitialValidationId = useRef<string | undefined>(initialValidation?.id);

  // Clear local override when parent data actually changes
  useEffect(() => {
    if (prevInitialValidationId.current !== initialValidation?.id) {
      setLocalOverride(null);
      prevInitialValidationId.current = initialValidation?.id;
    }
  }, [initialValidation?.id]);

  // Compute current validation: use local override if set, otherwise use parent data
  const currentValidation = localOverride?.cleared ? undefined : initialValidation;

  const handlePressStart = () => {
    pressStartTime.current = Date.now();

    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setShowStatusMenu(true);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const pressDuration = Date.now() - pressStartTime.current;

    if (pressDuration < 500 && !showStatusMenu) {
      navigate(`/routes/${route.id}`);
    }
  };

  const handlePressCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleStatusMenuClose = () => {
    setShowStatusMenu(false);
    onStatusChange?.();
  };

  const handleQuickValidate = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const isCurrentlyValide = currentValidation?.status === ValidationStatus.VALIDE;

    // If already validated (VALIDE), remove validation
    if (currentValidation?.id && isCurrentlyValide) {
      try {
        setIsValidating(true);
        const response = await fetch(`${API_URL}/api/validations/${currentValidation.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.ok) {
          // Set local override to show as cleared immediately (optimistic update)
          setLocalOverride({ cleared: true });
          onStatusChange?.();
        }
      } catch (error) {
        console.error('Failed to remove validation:', error);
        alert('Erreur lors de la suppression');
      } finally {
        setIsValidating(false);
      }
      return;
    }

    // Otherwise, open modal to choose attempts/status
    setShowStatusMenu(true);
  };

  // Get difficulty color based on difficulty color name
  const getDifficultyColor = (difficulty: string): { color: string; bg: string; light: string } => {
    const difficultyColorMap: Record<string, { color: string; bg: string; light: string }> = {
      'Vert': { color: '#22c55e', bg: '#22c55e20', light: '#dcfce7' },
      'Vert clair': { color: '#86efac', bg: '#86efac20', light: '#f0fdf4' },
      'Bleu clair': { color: '#7dd3fc', bg: '#7dd3fc20', light: '#e0f2fe' },
      'Bleu': { color: '#3b82f6', bg: '#3b82f620', light: '#dbeafe' },
      'Bleu foncé': { color: '#3b82f6', bg: '#3b82f620', light: '#dbeafe' },
      'Jaune': { color: '#eab308', bg: '#eab30820', light: '#fef9c3' },
      'Orange clair': { color: '#f97316', bg: '#f9731620', light: '#ffedd5' },
      'Orange': { color: '#f97316', bg: '#f9731620', light: '#ffedd5' },
      'Orange foncé': { color: '#ea580c', bg: '#ea580c20', light: '#fed7aa' },
      'Rouge': { color: '#ef4444', bg: '#ef444420', light: '#fee2e2' },
      'Rose': { color: '#ec4899', bg: '#ec489920', light: '#fce7f3' },
      'Violet': { color: '#a855f7', bg: '#a855f720', light: '#f3e8ff' },
      'Blanc': { color: '#e5e7eb', bg: '#e5e7eb20', light: '#f9fafb' },
      'Gris': { color: '#6b7280', bg: '#6b728020', light: '#f3f4f6' },
      'Noir': { color: '#1f2937', bg: '#1f293720', light: '#f3f4f6' },
    };

    return difficultyColorMap[difficulty] || { color: '#9ca3af', bg: '#9ca3af20', light: '#f3f4f6' };
  };

  // Get favorite badge (only shown for favorites)
  const getFavoriteBadge = () => {
    if (!currentValidation?.isFavorite) return null;

    return (
      <div className="absolute top-1 left-1 bg-hold-pink text-white w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-white">
        <span className="material-symbols-outlined text-[10px] fill-1">favorite</span>
      </div>
    );
  };

  // Get validation button style and icon based on status
  const getValidationButtonStyle = () => {
    if (!currentValidation) {
      return {
        bgClass: 'bg-white text-climb-dark hover:bg-hold-green hover:text-white',
        icon: 'check',
      };
    }

    if (currentValidation.status === ValidationStatus.VALIDE) {
      if (currentValidation.isFlashed) {
        return {
          bgClass: 'bg-hold-yellow text-climb-dark',
          icon: 'bolt',
        };
      }
      return {
        bgClass: 'bg-hold-green text-white',
        icon: 'check',
      };
    }

    // EN_PROJET (project)
    return {
      bgClass: 'bg-hold-orange text-white',
      icon: 'schedule',
    };
  };

  const difficultyColors = getDifficultyColor(route.difficulty);
  const buttonStyle = getValidationButtonStyle();

  // Grid mode - vertical card (compact)
  if (viewMode === 'grid') {
    return (
      <>
        <div
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressCancel}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressCancel}
          className="group relative flex flex-col gap-1 rounded-2xl p-1.5 border-2 border-climb-dark shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-200 cursor-pointer select-none"
          style={{ backgroundColor: difficultyColors.light }}
        >
          {/* Image */}
          <div className="relative aspect-[5/4] w-full rounded-xl overflow-hidden bg-white">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${route.mainPhoto})` }}
            ></div>

            {/* Favorite Badge */}
            {getFavoriteBadge()}

            {/* Difficulty Color Badge */}
            <div className="absolute bottom-1 right-1">
              <div
                className="w-5 h-5 rounded-lg shadow-sm border border-white flex items-center justify-center"
                style={{ backgroundColor: difficultyColors.color }}
              >
                <span className="text-white text-[7px] font-extrabold drop-shadow-sm">
                  {route.difficulty.substring(0, 2)}
                </span>
              </div>
            </div>

            {/* Validations Count */}
            {route.validationsCount !== undefined && route.validationsCount > 0 && (
              <div className="absolute top-1 right-1 bg-climb-dark/80 backdrop-blur-sm text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">
                {route.validationsCount}
              </div>
            )}

            {/* Hold Color Indicator */}
            {route.holdColorHex && (
              <div className="absolute bottom-1 left-1 pointer-events-none">
                <HoldColorIndicator holdColorHex={route.holdColorHex} size={20} className="drop-shadow-md" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-0.5 px-0.5 pb-0.5 bg-white rounded-lg p-1.5">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-[10px] font-extrabold text-climb-dark leading-tight truncate flex-1">
                {route.name}
              </h3>
              <MiniGymLayout sector={route.sector} size="sm" />
            </div>
            <div className="flex items-center gap-1">
              <span
                className="text-[8px] font-extrabold px-1 py-0.5 rounded"
                style={{ backgroundColor: difficultyColors.bg, color: difficultyColors.color }}
              >
                {route.difficulty}
              </span>
              <span className="text-[8px] text-climb-dark/50 font-bold truncate">
                {route.holdColorCategory}
              </span>
            </div>
          </div>

          {/* Quick Validate Button */}
          <button
            onClick={handleQuickValidate}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            disabled={isValidating}
            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 z-10 border border-climb-dark shadow-sm ${buttonStyle.bgClass} ${isValidating ? 'opacity-50 cursor-wait' : 'active:scale-95'}`}
            title={currentValidation ? 'Modifier le statut' : 'Valider la voie'}
          >
            {isValidating ? (
              <span className="material-symbols-outlined text-[12px] animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[12px] fill-1">{buttonStyle.icon}</span>
            )}
          </button>
        </div>

        {/* Status Menu Modal */}
        {showStatusMenu && (
          <QuickStatusMenu
            routeId={route.id}
            routeName={route.name}
            currentValidation={currentValidation}
            onClose={handleStatusMenuClose}
            onStatusChange={onStatusChange}
          />
        )}
      </>
    );
  }

  // List mode - horizontal card
  return (
    <>
      <div
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressCancel}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressCancel}
        className="group relative flex flex-row h-20 rounded-2xl p-1.5 border-2 border-climb-dark shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-200 cursor-pointer select-none overflow-hidden"
        style={{ backgroundColor: difficultyColors.light }}
      >
        {/* Image */}
        <div className="relative w-[68px] h-full flex-shrink-0 rounded-xl overflow-hidden bg-white">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${route.mainPhoto})` }}
          ></div>

          {/* Status Badge */}
          {getFavoriteBadge()}

          {/* Hold Color Indicator */}
          {route.holdColorHex && (
            <div className="absolute bottom-1 left-1 pointer-events-none">
              <HoldColorIndicator holdColorHex={route.holdColorHex} size={22} className="drop-shadow-md" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center flex-1 min-w-0 px-3">
          <h3 className="text-sm font-extrabold text-climb-dark leading-tight truncate">
            {route.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[11px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap"
              style={{ backgroundColor: difficultyColors.bg, color: difficultyColors.color }}
            >
              {route.difficulty}
            </span>
            <span className="text-[10px] text-climb-dark/50 font-bold truncate">
              {route.opener?.name}
            </span>
          </div>
        </div>

        {/* Right side: SVG + Button */}
        <div className="flex items-center gap-2 pr-1">
          <MiniGymLayout sector={route.sector} />

          {/* Quick Validate Button */}
          <button
            onClick={handleQuickValidate}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            disabled={isValidating}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 z-10 border-2 border-climb-dark shadow-neo-sm flex-shrink-0 ${buttonStyle.bgClass} ${isValidating ? 'opacity-50 cursor-wait' : 'active:scale-95'}`}
            title={currentValidation ? 'Modifier le statut' : 'Valider la voie'}
          >
            {isValidating ? (
              <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[20px] fill-1">{buttonStyle.icon}</span>
            )}
          </button>
        </div>
      </div>

      {/* Status Menu Modal */}
      {showStatusMenu && (
        <QuickStatusMenu
          routeId={route.id}
          routeName={route.name}
          currentValidation={currentValidation}
          onClose={handleStatusMenuClose}
          onStatusChange={onStatusChange}
        />
      )}
    </>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export const RouteCardWithStatus = memo(RouteCardWithStatusComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  return (
    prevProps.route.id === nextProps.route.id &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.initialValidation?.id === nextProps.initialValidation?.id &&
    prevProps.initialValidation?.status === nextProps.initialValidation?.status &&
    prevProps.initialValidation?.isFavorite === nextProps.initialValidation?.isFavorite
  );
});
