import { useState, useEffect } from 'react';

interface DateFilterProps {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onDateChange: (from: string | undefined, to: string | undefined) => void;
}

type PresetType = 'week' | 'month' | 'year' | null;

export const DateFilter = ({ dateFrom, dateTo, onDateChange }: DateFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetType>(null);

  const handleFromChange = (value: string) => {
    setActivePreset(null);
    onDateChange(value || undefined, dateTo);
  };

  const handleToChange = (value: string) => {
    setActivePreset(null);
    onDateChange(dateFrom, value || undefined);
  };

  const clearFilters = () => {
    setActivePreset(null);
    onDateChange(undefined, undefined);
  };

  const hasFilters = dateFrom || dateTo;

  // Calculate preset dates
  const getPresetDates = (preset: PresetType) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (preset) {
      case 'week': {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        return { from: lastWeek.toISOString().split('T')[0], to: todayStr };
      }
      case 'month': {
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return { from: lastMonth.toISOString().split('T')[0], to: todayStr };
      }
      case 'year': {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return { from: startOfYear.toISOString().split('T')[0], to: todayStr };
      }
      default:
        return { from: undefined, to: undefined };
    }
  };

  // Toggle preset
  const togglePreset = (preset: PresetType) => {
    if (activePreset === preset) {
      // Toggle off
      setActivePreset(null);
      onDateChange(undefined, undefined);
    } else {
      // Toggle on
      setActivePreset(preset);
      const dates = getPresetDates(preset);
      onDateChange(dates.from, dates.to);
    }
  };

  // Detect if current dates match a preset
  useEffect(() => {
    if (!dateFrom && !dateTo) {
      setActivePreset(null);
      return;
    }

    const presets: PresetType[] = ['week', 'month', 'year'];
    for (const preset of presets) {
      const dates = getPresetDates(preset);
      if (dateFrom === dates.from && dateTo === dates.to) {
        setActivePreset(preset);
        return;
      }
    }
    setActivePreset(null);
  }, [dateFrom, dateTo]);

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
              calendar_month
            </span>
          </div>
          <span className="text-sm font-extrabold text-climb-dark">
            Date d'ouverture
          </span>
          {hasFilters && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-blue text-white">
              1
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
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => togglePreset('week')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl border-2 transition-all ${
                activePreset === 'week'
                  ? 'bg-blue-200 border-blue-400 text-blue-900'
                  : 'border-climb-dark/20 bg-cream hover:bg-hold-blue/10 hover:border-hold-blue/40'
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => togglePreset('month')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl border-2 transition-all ${
                activePreset === 'month'
                  ? 'bg-green-200 border-green-400 text-green-900'
                  : 'border-climb-dark/20 bg-cream hover:bg-hold-blue/10 hover:border-hold-blue/40'
              }`}
            >
              30 jours
            </button>
            <button
              onClick={() => togglePreset('year')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl border-2 transition-all ${
                activePreset === 'year'
                  ? 'bg-purple-200 border-purple-400 text-purple-900'
                  : 'border-climb-dark/20 bg-cream hover:bg-hold-blue/10 hover:border-hold-blue/40'
              }`}
            >
              Cette année
            </button>
          </div>

          {/* Custom date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-1.5">
                Du
              </label>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={(e) => handleFromChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-bold rounded-xl border-2 border-climb-dark/20 bg-cream text-climb-dark focus:outline-none focus:border-hold-blue transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-1.5">
                Au
              </label>
              <input
                type="date"
                value={dateTo || ''}
                onChange={(e) => handleToChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-bold rounded-xl border-2 border-climb-dark/20 bg-cream text-climb-dark focus:outline-none focus:border-hold-blue transition-colors"
              />
            </div>
          </div>

          {/* Clear button */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 w-full text-[11px] font-bold text-hold-pink hover:text-hold-pink/80 py-1 border-t border-climb-dark/10 pt-3"
            >
              Réinitialiser les dates
            </button>
          )}
        </div>
      )}
    </div>
  );
};
