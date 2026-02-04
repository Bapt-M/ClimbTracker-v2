import { LeaderboardUser } from '../lib/api';

interface CurrentUserRankCardProps {
  userRank: LeaderboardUser | null;
  onShowDetails?: (userId: string, userName: string) => void;
}

export const CurrentUserRankCard = ({ userRank, onShowDetails }: CurrentUserRankCardProps) => {
  if (!userRank) {
    return (
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm z-30">
        <div className="bg-white rounded-3xl p-4 border-2 border-climb-dark shadow-neo text-center">
          <p className="text-sm font-bold text-climb-dark">
            Completez votre premiere voie pour entrer au classement!
          </p>
        </div>
      </div>
    );
  }

  const handleDetailsClick = () => {
    if (onShowDetails) {
      onShowDetails(userRank.userId, userRank.name);
    }
  };

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-3xl p-4 border-2 border-climb-dark shadow-neo flex items-center justify-between">
        {/* Rank Circle */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-hold-pink flex items-center justify-center border-2 border-climb-dark">
            <span className="text-sm font-extrabold text-white">
              {userRank.rank}
            </span>
          </div>

          {/* Info */}
          <div>
            <p className="text-[10px] font-bold text-climb-dark/60 uppercase tracking-tight">
              Ton Rang Actuel
            </p>
            <p className="text-base font-extrabold text-climb-dark">
              {(userRank.points ?? 0).toLocaleString()} points
            </p>
          </div>
        </div>

        {/* Details Button */}
        <button
          onClick={handleDetailsClick}
          className="btn-neo bg-hold-pink text-white text-[10px] px-4 py-2"
        >
          Details
        </button>
      </div>
    </div>
  );
};
