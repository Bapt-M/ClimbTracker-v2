import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersAPI, UserPublicProfile, UserStats } from '../lib/api';
import { useSession, signOut } from '../lib/auth-client';
import { BottomNav } from '../components/BottomNav';
import { KiviatChart } from '../components/KiviatChart';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { getDifficultyColor, getDifficultyOrder } from '../utils/gradeColors';

export default function UserProfile() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const currentUser = session?.user;

  const [user, setUser] = useState<UserPublicProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const [userData, statsData] = await Promise.all([
        usersAPI.getUserById(userId),
        usersAPI.getUserStats(userId),
      ]);

      setUser(userData as UserPublicProfile);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
          <p className="mt-4 text-climb-dark/60 font-bold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-hold-pink font-bold mb-4">{error || 'Utilisateur non trouve'}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-neo-primary"
          >
            Retour a l'accueil
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;

  // Find the highest difficulty from validationsByDifficulty
  const maxDifficulty = stats.validationsByDifficulty && stats.validationsByDifficulty.length > 0
    ? stats.validationsByDifficulty.reduce((max, current) => {
        return getDifficultyOrder(current.difficulty) > getDifficultyOrder(max.difficulty) ? current : max;
      })
    : null;

  const maxGrade = maxDifficulty?.difficulty || '-';
  const maxDifficultyColor = maxDifficulty ? getDifficultyColor(maxDifficulty.difficulty) : null;

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md mx-auto overflow-hidden bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-12 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-hold-pink flex items-center justify-center border-2 border-climb-dark shadow-neo-sm -rotate-3">
                <span className="material-symbols-outlined text-white text-[20px] rotate-3">person</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-climb-dark">
                {isOwnProfile ? 'Profil' : user.name}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-1 ml-12">
              <span className="w-2 h-2 rounded-full bg-hold-green animate-pulse"></span>
              <p className="text-[11px] font-bold text-climb-dark/60 uppercase tracking-widest">
                {stats.totalValidations} voies validees
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-hold-pink text-white border-2 border-climb-dark shadow-neo transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-6 pt-4 flex flex-col gap-8">
          {/* Profile Header */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-[2.5rem] overflow-hidden border-3 border-climb-dark bg-white rotate-3 shadow-neo">
                <div className="absolute inset-0 bg-hold-blue flex items-center justify-center -rotate-3">
                  <span className="text-white font-extrabold text-4xl">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="absolute -bottom-1 -right-1 bg-hold-yellow text-climb-dark rounded-full w-8 h-8 flex items-center justify-center border-2 border-climb-dark shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">edit</span>
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-3xl font-extrabold text-climb-dark leading-none">{user.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="pill-pink">
                  {user.role}
                </span>
                {stats.totalValidations > 0 && (
                  <span className="pill-dark">
                    {stats.totalValidations} voies
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stats-card bg-hold-blue/20">
              <span className="text-2xl font-extrabold text-climb-dark">{stats.totalValidations}</span>
              <span className="text-label mt-0.5">Voies</span>
            </div>
            <div className="stats-card bg-hold-yellow/20">
              <span
                className="text-2xl font-extrabold"
                style={{ color: maxDifficultyColor?.hex || '#252A34' }}
              >
                {maxGrade}
              </span>
              <span className="text-label mt-0.5">Niveau Max</span>
            </div>
            <div className="stats-card bg-hold-green/20">
              <span className="text-2xl font-extrabold text-climb-dark">{stats.totalComments}</span>
              <span className="text-label mt-0.5">Comments</span>
            </div>
          </div>

          {/* Physical Info */}
          {(user.age || user.height || user.wingspan) && (
            <div className="grid grid-cols-3 gap-4">
              {user.age && (
                <div className="stats-card bg-white">
                  <span className="text-2xl font-extrabold text-climb-dark">{user.age}</span>
                  <span className="text-label mt-0.5">Age</span>
                </div>
              )}
              {user.height && (
                <div className="stats-card bg-white">
                  <span className="text-2xl font-extrabold text-climb-dark">{user.height}</span>
                  <span className="text-label mt-0.5">Taille (cm)</span>
                </div>
              )}
              {user.wingspan && (
                <div className="stats-card bg-white">
                  <span className="text-2xl font-extrabold text-climb-dark">{user.wingspan}</span>
                  <span className="text-label mt-0.5">Envergure</span>
                </div>
              )}
            </div>
          )}

          {/* Total Points Card */}
          <div className="neo-card bg-gradient-to-br from-hold-pink to-hold-orange p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold uppercase tracking-wider opacity-90">
                Score Total
              </span>
              <span className="material-symbols-outlined text-[24px] fill-1">
                emoji_events
              </span>
            </div>
            <div className="text-4xl font-extrabold mb-1">
              {(stats.totalPoints ?? 0).toLocaleString()}
            </div>
            <div className="text-xs opacity-80 leading-relaxed font-medium">
              {stats.totalPoints === 0
                ? 'Validez des voies pour gagner des points!'
                : 'Points calcules selon la difficulte et le nombre d\'essais'}
            </div>
          </div>

          {/* Points System Explanation */}
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between px-1">
              <h3 className="text-lg font-extrabold text-climb-dark">Systeme de Points</h3>
            </div>
            <div className="neo-card p-5">
              <div className="space-y-4 text-sm text-climb-dark/70">
                <div>
                  <p className="font-extrabold text-climb-dark mb-1">Formule :</p>
                  <p className="leading-relaxed">
                    Points = <span className="font-bold text-hold-orange">GRADE</span> x Difficulte voie x Performance
                  </p>
                </div>

                <div>
                  <p className="font-extrabold text-climb-dark mb-1">Le GRADE compte le plus :</p>
                  <p className="leading-relaxed">
                    Echelle exponentielle x1.5 (une Noir vaut 1.5x une Gris)
                  </p>
                </div>

                <div>
                  <p className="font-extrabold text-climb-dark mb-1">Votre performance :</p>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between bg-cream rounded-lg px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-hold-yellow fill-1">bolt</span>
                        Flash (1 essai)
                      </span>
                      <span className="font-extrabold text-hold-orange">x1.3</span>
                    </div>
                    <div className="flex items-center justify-between bg-cream rounded-lg px-3 py-2">
                      <span>2-3 essais</span>
                      <span className="font-extrabold text-hold-green">x1.2 - x1.1</span>
                    </div>
                    <div className="flex items-center justify-between bg-cream rounded-lg px-3 py-2">
                      <span>4 essais</span>
                      <span className="font-extrabold">x1.0</span>
                    </div>
                    <div className="flex items-center justify-between bg-cream rounded-lg px-3 py-2">
                      <span>5+ essais</span>
                      <span className="font-extrabold text-hold-pink">x0.9</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kiviat Chart */}
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between px-1">
              <h3 className="text-lg font-extrabold text-climb-dark">Statistiques</h3>
            </div>
            <div className="neo-card p-4">
              <KiviatChart userId={user.id} />
            </div>
          </div>

          {/* Grade Pyramid */}
          {stats.validationsByDifficulty && stats.validationsByDifficulty.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between px-1">
                <h3 className="text-lg font-extrabold text-climb-dark">Pyramide des Grades</h3>
                <span className="text-[10px] font-bold text-climb-dark/40 uppercase tracking-wider">
                  Par difficulte
                </span>
              </div>
              <div className="neo-card p-6">
                <div className="flex flex-col gap-3">
                  {stats.validationsByDifficulty.slice(0, 8).map((item) => {
                    const percentage = (item.count / stats.totalValidations) * 100;
                    const gradeColor = getDifficultyColor(item.difficulty);

                    return (
                      <div key={item.difficulty} className="flex items-center gap-3">
                        <div
                          className="w-16 h-7 rounded-lg flex items-center justify-center border-2 border-climb-dark shrink-0"
                          style={{ backgroundColor: gradeColor.hex }}
                        >
                          <span className="text-[10px] font-extrabold text-white drop-shadow-sm">
                            {item.difficulty}
                          </span>
                        </div>
                        <div className="flex-1 h-5 rounded-full bg-climb-dark/5 overflow-hidden border border-climb-dark/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(percentage, 5)}%`,
                              backgroundColor: gradeColor.hex,
                            }}
                          ></div>
                        </div>
                        <div className="flex items-center gap-1 w-10 justify-end">
                          <span className="text-sm font-extrabold text-climb-dark">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent Sends */}
          {stats.recentValidations && stats.recentValidations.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between px-1">
                <h3 className="text-lg font-extrabold text-climb-dark">Derniers Enchainements</h3>
                <span className="text-[10px] font-bold text-climb-dark/40 uppercase tracking-wider">Ce mois</span>
              </div>
              <div className="flex flex-col gap-3">
                {stats.recentValidations.slice(0, 5).map((validation) => {
                  const difficultyColor = validation.route.difficulty
                    ? getDifficultyColor(validation.route.difficulty)
                    : null;

                  return (
                    <button
                      key={validation.id}
                      onClick={() => navigate(`/routes/${validation.route.id}`)}
                      className="neo-card-interactive flex items-center gap-4 p-4"
                    >
                      <div
                        className="hold-badge -rotate-3"
                        style={{
                          backgroundColor: difficultyColor?.hex || '#6b7280',
                        }}
                      >
                        <span className="text-sm font-extrabold text-white rotate-3 drop-shadow">
                          {validation.route.difficulty}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-base font-extrabold text-climb-dark truncate">
                          {validation.route.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-climb-dark/50 mt-0.5">
                          <span className="bg-cream px-1.5 py-0.5 rounded border border-climb-dark/10">
                            {validation.route.sector}
                          </span>
                          <span>{formatDate(validation.validatedAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="material-symbols-outlined text-[20px] text-hold-green fill-1">
                          check_circle
                        </span>
                        <span className="text-[8px] font-extrabold uppercase text-hold-green tracking-widest">
                          Fait
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Edit Profile Modal */}
      {isEditingProfile && isOwnProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-climb-dark/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-cream rounded-3xl border-2 border-climb-dark shadow-neo-lg">
            <div className="p-6">
              <ProfileEditForm
                user={user as any}
                onSuccess={() => {
                  setIsEditingProfile(false);
                  loadUserData();
                }}
                onCancel={() => setIsEditingProfile(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
