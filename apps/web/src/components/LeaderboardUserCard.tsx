import { LeaderboardUser } from '../lib/api';
import { getDifficultyColor } from '../utils/gradeColors';

interface LeaderboardUserCardProps {
  user: LeaderboardUser;
  isCurrentUser?: boolean;
  onShowDetails?: (userId: string, userName: string) => void;
}

const getRankStyle = (rank: number): { badge: string; bg: string; accent: string } => {
  if (rank === 2) return {
    badge: 'rank-badge-silver',
    bg: 'bg-gradient-to-r from-gray-100 to-white',
    accent: '#9ca3af'
  };
  if (rank === 3) return {
    badge: 'rank-badge-bronze',
    bg: 'bg-gradient-to-r from-orange-50 to-white',
    accent: '#fb923c'
  };
  if (rank <= 5) return {
    badge: 'w-10 h-10 rounded-full flex items-center justify-center font-extrabold bg-hold-purple text-white border-2 border-climb-dark',
    bg: 'bg-gradient-to-r from-purple-50 to-white',
    accent: '#a855f7'
  };
  if (rank <= 10) return {
    badge: 'w-10 h-10 rounded-full flex items-center justify-center font-extrabold bg-hold-blue text-white border-2 border-climb-dark',
    bg: 'bg-gradient-to-r from-cyan-50 to-white',
    accent: '#08D9D6'
  };
  return {
    badge: 'w-10 h-10 rounded-full flex items-center justify-center font-extrabold bg-cream border-2 border-climb-dark/20 text-climb-dark',
    bg: 'bg-white',
    accent: '#6b7280'
  };
};

export const LeaderboardUserCard = ({ user, isCurrentUser = false, onShowDetails }: LeaderboardUserCardProps) => {
  const validatedColor = user.validatedGrade ? getDifficultyColor(user.validatedGrade) : null;
  const rankStyle = getRankStyle(user.rank);

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[LeaderboardUserCard] Details clicked for user:', user.userId, user.name);
    if (onShowDetails) {
      onShowDetails(user.userId, user.name);
    } else {
      console.log('[LeaderboardUserCard] onShowDetails is not defined!');
    }
  };

  return (
    <div
      className={`group flex items-center gap-4 rounded-3xl p-4 border-2 transition-all active:translate-x-1 active:translate-y-1 relative overflow-hidden ${
        isCurrentUser
          ? 'bg-hold-pink/10 border-hold-pink shadow-neo-pink active:shadow-none'
          : `${rankStyle.bg} border-climb-dark shadow-neo active:shadow-none`
      }`}
    >
      {/* Colored accent line */}
      {!isCurrentUser && user.rank <= 10 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: rankStyle.accent }}
        />
      )}

      {/* Rank Badge */}
      <div className={rankStyle.badge}>
        <span className="text-sm">{user.rank}</span>
      </div>

      {/* Avatar */}
      <div
        className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden border-2 border-climb-dark -rotate-3"
        style={{ backgroundColor: user.rank <= 3 ? rankStyle.accent + '30' : '#FDFCF0' }}
      >
        {user.avatar ? (
          <div
            className="h-full w-full bg-cover bg-center rotate-3"
            style={{ backgroundImage: `url(${user.avatar})` }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center rotate-3">
            <span
              className="material-symbols-outlined text-[24px] font-bold"
              style={{ color: user.rank <= 10 ? rankStyle.accent : 'rgba(37, 42, 52, 0.4)' }}
            >
              person
            </span>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <h3 className="text-climb-dark text-base font-extrabold leading-none">
            {user.name}
          </h3>
          {isCurrentUser && (
            <span className="pill-pink text-[8px] px-2 py-0.5">
              Moi
            </span>
          )}
        </div>
        <p className="text-[10px] text-climb-dark/50 font-bold mt-1">
          {(user.points ?? 0).toLocaleString()} pts - {user.totalValidations ?? 0} voies
        </p>
      </div>

      {/* Stats & Actions */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-col items-end">
          {user.validatedGrade && validatedColor ? (
            <span className="text-sm font-extrabold" style={{ color: validatedColor.hex }}>
              {user.validatedGrade}
            </span>
          ) : (
            <span className="text-sm font-extrabold text-climb-dark/40">-</span>
          )}
          {(user.flashRate ?? 0) > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[14px] text-hold-yellow fill-1">bolt</span>
              <span className="text-[10px] font-bold text-climb-dark/60">{(user.flashRate ?? 0).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Details Button */}
        {onShowDetails && (
          <button
            onClick={handleDetailsClick}
            className="px-3 py-1.5 text-[10px] font-extrabold text-climb-dark/60 hover:text-hold-pink bg-cream border-2 border-climb-dark/20 hover:border-hold-pink rounded-full transition-all active:scale-95 uppercase tracking-wide"
          >
            Details
          </button>
        )}
      </div>
    </div>
  );
};
