import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession, signOut } from '../lib/auth-client';
import { BottomNav } from '../components/BottomNav';
import { LeaderboardTopUser } from '../components/LeaderboardTopUser';
import { LeaderboardUserCard } from '../components/LeaderboardUserCard';
import { CurrentUserRankCard } from '../components/CurrentUserRankCard';
import { UserValidationDetailsModal } from '../components/UserValidationDetailsModal';
import { leaderboardAPI, LeaderboardUser } from '../lib/api';

type TabType = 'global' | 'friends';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(1);
  const [limit] = useState(50);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  useEffect(() => {
    loadLeaderboard();
    loadCurrentUserRank();
  }, [activeTab, page]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await leaderboardAPI.getLeaderboard({
        tab: activeTab,
        page,
        limit,
      });
      setUsers(result.users);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le classement');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUserRank = async () => {
    try {
      const rank = await leaderboardAPI.getCurrentUserRank();
      setCurrentUserRank(rank);
    } catch (err) {
      setCurrentUserRank(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleShowDetails = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedUserId(null);
    setSelectedUserName('');
  };

  const topUser = users.length > 0 ? users[0] : null;
  const otherUsers = users.slice(1);

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md mx-auto overflow-hidden bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-12 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-hold-yellow flex items-center justify-center border-2 border-climb-dark shadow-neo-sm rotate-3">
                <span className="material-symbols-outlined text-climb-dark text-[20px] -rotate-3">leaderboard</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-climb-dark">
                Classement
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-1 ml-12">
              <span className="w-2 h-2 rounded-full bg-hold-green animate-pulse"></span>
              <p className="text-[11px] font-bold text-climb-dark/60 uppercase tracking-widest">
                {users.length} grimpeurs
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

        {/* Tabs */}
        <div className="flex px-6 gap-3 pb-4">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-5 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all ${
              activeTab === 'global'
                ? 'bg-hold-yellow text-climb-dark border-2 border-climb-dark shadow-neo-sm'
                : 'bg-white text-climb-dark/60 border-2 border-climb-dark/20 hover:border-climb-dark/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">public</span>
              Global
            </span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-5 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all ${
              activeTab === 'friends'
                ? 'bg-hold-purple text-white border-2 border-climb-dark shadow-neo-sm'
                : 'bg-white text-climb-dark/60 border-2 border-climb-dark/20 hover:border-climb-dark/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">group</span>
              Amis
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pb-32 gap-4 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
            <p className="mt-4 text-climb-dark/60 font-bold">Chargement du classement...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 px-5">
            <p className="text-climb-dark font-bold mb-4">{error}</p>
            <button
              onClick={loadLeaderboard}
              className="btn-neo-primary"
            >
              Reessayer
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 px-6">
            {activeTab === 'friends' ? (
              <>
                <p className="text-climb-dark/60 font-medium mb-4">
                  Vous n'avez pas encore d'amis ou ils n'ont pas de validations
                </p>
                <button
                  onClick={() => navigate('/friends')}
                  className="btn-neo-primary"
                >
                  Gerer mes amis
                </button>
              </>
            ) : (
              <p className="text-climb-dark/60 font-medium">Aucun utilisateur classe pour le moment</p>
            )}
          </div>
        ) : (
          <>
            {/* Top User */}
            {topUser && <LeaderboardTopUser user={topUser} />}

            {/* Other Users */}
            <div className="space-y-3">
              {otherUsers.map((userData) => (
                <LeaderboardUserCard
                  key={userData.userId}
                  user={userData}
                  isCurrentUser={userData.userId === user?.id}
                  onShowDetails={handleShowDetails}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Current User Rank Card */}
      {!loading && <CurrentUserRankCard userRank={currentUserRank} onShowDetails={handleShowDetails} />}

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Details Modal */}
      {showDetailsModal && selectedUserId && (
        <UserValidationDetailsModal
          userId={selectedUserId}
          userName={selectedUserName}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
