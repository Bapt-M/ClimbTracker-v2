import { LeaderboardUser } from '../lib/api';
import { getDifficultyColor } from '../utils/gradeColors';

interface LeaderboardTopUserProps {
  user: LeaderboardUser;
}

export const LeaderboardTopUser = ({ user }: LeaderboardTopUserProps) => {
  const validatedColor = user.validatedGrade ? getDifficultyColor(user.validatedGrade) : null;

  return (
    <div className="mb-4 relative overflow-hidden rounded-3xl bg-hold-yellow/20 border-2 border-climb-dark p-6 flex flex-col items-center gap-4 shadow-neo">
      {/* Top 1 Badge */}
      <div className="absolute top-4 right-4 bg-hold-yellow text-climb-dark text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border-2 border-climb-dark shadow-neo-sm">
        Top 1
      </div>

      {/* Avatar */}
      <div className="relative">
        <div className="h-24 w-24 rounded-[2.5rem] overflow-hidden border-3 border-climb-dark bg-white rotate-3 shadow-neo">
          {user.avatar ? (
            <div
              className="h-full w-full bg-cover bg-center -rotate-3"
              style={{ backgroundImage: `url(${user.avatar})` }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center -rotate-3">
              <span className="material-symbols-outlined text-climb-dark/40 text-[40px]">
                person
              </span>
            </div>
          )}
        </div>
        {/* Medal Icon */}
        <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-hold-yellow rounded-full flex items-center justify-center border-2 border-climb-dark shadow-sm">
          <span className="material-symbols-outlined text-climb-dark text-[18px] fill-1">
            military_tech
          </span>
        </div>
      </div>

      {/* User Info */}
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-climb-dark leading-tight">{user.name}</h2>
        <p className="text-climb-dark/60 text-xs font-bold mt-1">
          {(user.points ?? 0).toLocaleString()} pts - {user.totalValidations ?? 0} voies
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 w-full mt-2">
        <div className="stats-card flex-1 bg-white">
          <p className="text-[9px] text-climb-dark/60 font-bold uppercase tracking-tighter">Niveau Max</p>
          {user.validatedGrade && validatedColor ? (
            <p className="text-xl font-extrabold" style={{ color: validatedColor.hex }}>
              {user.validatedGrade}
            </p>
          ) : (
            <p className="text-xl font-extrabold text-climb-dark/40">-</p>
          )}
        </div>
        <div className="stats-card flex-1 bg-white">
          <p className="text-[9px] text-climb-dark/60 font-bold uppercase tracking-tighter">Flash Rate</p>
          <p className="text-xl font-extrabold text-hold-green">{(user.flashRate ?? 0).toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
};
