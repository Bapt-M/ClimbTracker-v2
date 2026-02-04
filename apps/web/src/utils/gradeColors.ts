/**
 * Map difficulty colors to Tailwind CSS classes and hex colors
 */

export const getDifficultyColor = (difficulty: string): { bg: string; text: string; hex: string } => {
  const difficultyColors: Record<string, { bg: string; text: string; hex: string }> = {
    'Vert': { bg: 'bg-[#22c55e]', text: 'text-[#22c55e]', hex: '#22c55e' },
    'Vert clair': { bg: 'bg-[#86efac]', text: 'text-[#86efac]', hex: '#86efac' },
    'Bleu clair': { bg: 'bg-[#7dd3fc]', text: 'text-[#7dd3fc]', hex: '#7dd3fc' },
    'Bleu foncé': { bg: 'bg-[#3b82f6]', text: 'text-[#3b82f6]', hex: '#3b82f6' },
    'Violet': { bg: 'bg-[#a855f7]', text: 'text-[#a855f7]', hex: '#a855f7' },
    'Rose': { bg: 'bg-[#ec4899]', text: 'text-[#ec4899]', hex: '#ec4899' },
    'Rouge': { bg: 'bg-[#ef4444]', text: 'text-[#ef4444]', hex: '#ef4444' },
    'Orange': { bg: 'bg-[#f97316]', text: 'text-[#f97316]', hex: '#f97316' },
    'Jaune': { bg: 'bg-[#eab308]', text: 'text-[#eab308]', hex: '#eab308' },
    'Blanc': { bg: 'bg-[#e5e7eb]', text: 'text-[#e5e7eb]', hex: '#e5e7eb' },
    'Gris': { bg: 'bg-[#6b7280]', text: 'text-[#6b7280]', hex: '#6b7280' },
    'Noir': { bg: 'bg-[#1f2937]', text: 'text-[#1f2937]', hex: '#1f2937' },
  };

  return difficultyColors[difficulty] || { bg: 'bg-mono-500', text: 'text-mono-500', hex: '#6b7280' };
};

/**
 * Get the difficulty order for sorting
 */
export const getDifficultyOrder = (difficulty: string): number => {
  const order: Record<string, number> = {
    'Vert': 1,
    'Vert clair': 2,
    'Bleu clair': 3,
    'Bleu foncé': 4,
    'Violet': 5,
    'Rose': 6,
    'Rouge': 7,
    'Orange': 8,
    'Jaune': 9,
    'Blanc': 10,
    'Gris': 11,
    'Noir': 12,
  };

  return order[difficulty] || 0;
};
