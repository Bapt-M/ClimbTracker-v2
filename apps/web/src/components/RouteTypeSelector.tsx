interface RouteTypeSelectorProps {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

const PASTEL_COLORS = [
  { bg: 'bg-pink-200', border: 'border-pink-300', text: 'text-pink-900' },
  { bg: 'bg-blue-200', border: 'border-blue-300', text: 'text-blue-900' },
  { bg: 'bg-green-200', border: 'border-green-300', text: 'text-green-900' },
  { bg: 'bg-yellow-200', border: 'border-yellow-300', text: 'text-yellow-900' },
  { bg: 'bg-purple-200', border: 'border-purple-300', text: 'text-purple-900' },
  { bg: 'bg-orange-200', border: 'border-orange-300', text: 'text-orange-900' },
  { bg: 'bg-teal-200', border: 'border-teal-300', text: 'text-teal-900' },
  { bg: 'bg-rose-200', border: 'border-rose-300', text: 'text-rose-900' },
];

const TYPE_COLOR_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7];

const ROUTE_TYPES = [
  { value: 'reglette', label: 'Reglette' },
  { value: 'devers', label: 'Devers' },
  { value: 'dalle', label: 'Dalle' },
  { value: 'toit', label: 'Toit' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'arete', label: 'Arete' },
  { value: 'diedre', label: 'Diedre' },
  { value: 'technique', label: 'Technique' },
  { value: 'physique', label: 'Physique' },
  { value: 'resistance', label: 'Resistance' },
  { value: 'bloc', label: 'Bloc' },
  { value: 'continuous', label: 'Continuous' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'static', label: 'Static' },
  { value: 'coordination', label: 'Coordination' },
  { value: 'balance', label: 'Balance' },
];

export const RouteTypeSelector = ({
  selectedTypes,
  onChange,
}: RouteTypeSelectorProps) => {
  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const getColorClasses = (index: number, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white border-climb-dark/20 text-climb-dark hover:border-climb-dark/40';
    }
    const color = PASTEL_COLORS[TYPE_COLOR_INDEX[index]];
    return `${color.bg} ${color.border} ${color.text}`;
  };

  return (
    <div className="route-type-selector">
      <label className="block text-sm font-extrabold text-climb-dark mb-2">
        Caracteristiques de la voie (selectionnez plusieurs) :
      </label>

      <div className="grid grid-cols-2 gap-2">
        {ROUTE_TYPES.map(({ value, label }, index) => (
          <label
            key={value}
            className={`
              flex items-center gap-2 px-3 py-2 border-2 rounded-xl cursor-pointer transition-all text-sm
              ${getColorClasses(index, selectedTypes.includes(value))}
            `}
          >
            <input
              type="checkbox"
              checked={selectedTypes.includes(value)}
              onChange={() => toggleType(value)}
              className="w-4 h-4 accent-current"
            />
            <span className="font-bold">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
