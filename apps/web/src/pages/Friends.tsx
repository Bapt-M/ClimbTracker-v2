import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../lib/auth-client';
import { BottomNav } from '../components/BottomNav';
import {
  friendshipsAPI,
  FriendshipWithUser,
  UserSearchResult,
  FriendshipStatus,
} from '../lib/api';

type TabType = 'friends' | 'requests' | 'search';

// Get a consistent color based on user name
const getAvatarColor = (name: string): string => {
  const colors = [
    '#FF2E63', // pink
    '#08D9D6', // blue
    '#2ECC71', // green
    '#a855f7', // purple
    '#f97316', // orange
    '#eab308', // yellow
    '#3b82f6', // blue dark
    '#ec4899', // rose
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function Friends() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<FriendshipWithUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipWithUser[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends();
    } else if (activeTab === 'requests') {
      loadPendingRequests();
    }
  }, [activeTab]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await friendshipsAPI.getFriends();
      setFriends(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les amis');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await friendshipsAPI.getPendingRequests();
      setPendingRequests(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await friendshipsAPI.searchUsers(searchTerm);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await friendshipsAPI.sendFriendRequest(userId);
      // Rafraichir les resultats
      await handleSearch();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'envoi de la demande');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await friendshipsAPI.acceptFriendRequest(friendshipId);
      await loadPendingRequests();
      await loadFriends();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'acceptation');
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await friendshipsAPI.rejectFriendRequest(friendshipId);
      await loadPendingRequests();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du rejet');
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Etes-vous sur de vouloir retirer cet ami ?')) return;

    try {
      await friendshipsAPI.removeFriend(friendshipId);
      await loadFriends();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md mx-auto overflow-hidden bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-12 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-hold-purple flex items-center justify-center border-2 border-climb-dark shadow-neo-sm rotate-3">
                <span className="material-symbols-outlined text-white text-[20px] -rotate-3">group</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-climb-dark">
                Amis
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-1 ml-12">
              <span className="w-2 h-2 rounded-full bg-hold-green animate-pulse"></span>
              <p className="text-[11px] font-bold text-climb-dark/60 uppercase tracking-widest">
                {friends.length} ami{friends.length !== 1 ? 's' : ''}
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
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all ${
              activeTab === 'friends'
                ? 'bg-hold-blue text-white shadow-neo-sm'
                : 'bg-white text-climb-dark/60 border-2 border-climb-dark/20 hover:border-climb-dark/40'
            }`}
          >
            Mes Amis
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all relative ${
              activeTab === 'requests'
                ? 'bg-hold-green text-white shadow-neo-sm'
                : 'bg-white text-climb-dark/60 border-2 border-climb-dark/20 hover:border-climb-dark/40'
            }`}
          >
            Demandes
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-hold-pink text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-cream">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all ${
              activeTab === 'search'
                ? 'bg-climb-dark text-white shadow-neo-sm'
                : 'bg-white text-climb-dark/60 border-2 border-climb-dark/20 hover:border-climb-dark/40'
            }`}
          >
            Rechercher
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 pb-32 gap-4 overflow-y-auto no-scrollbar">
        {/* Search Tab */}
        {activeTab === 'search' && (
          <>
            <div className="flex gap-3">
              <div className="flex-1 flex items-center rounded-2xl bg-white border-2 border-climb-dark shadow-neo h-12">
                <div className="flex items-center justify-center pl-4 pr-2 text-climb-dark/40">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-climb-dark placeholder:text-climb-dark/40 text-sm py-2 pl-0 font-bold"
                />
              </div>
              <button
                onClick={handleSearch}
                className="h-12 w-12 rounded-xl bg-hold-pink text-white border-2 border-climb-dark shadow-neo flex items-center justify-center transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
              </div>
            ) : searchResults.length === 0 && searchTerm ? (
              <div className="text-center py-12">
                <p className="text-climb-dark/60 font-bold">Aucun utilisateur trouve</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="relative flex items-center gap-4 p-4 pr-28 rounded-3xl bg-white border-2 border-climb-dark shadow-neo"
                  >
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border-2 border-climb-dark -rotate-3"
                      style={{ backgroundColor: getAvatarColor(user.name) }}
                    >
                      <span className="text-white font-extrabold text-lg rotate-3">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-extrabold text-climb-dark truncate">
                        {user.name}
                      </h3>
                      <p className="text-xs text-climb-dark/50 font-bold truncate">{user.email}</p>
                    </div>
                    {user.friendshipStatus === null && (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        className="absolute right-4 px-4 py-2 bg-hold-pink text-white text-xs font-extrabold rounded-xl border-2 border-climb-dark shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      >
                        Ajouter
                      </button>
                    )}
                    {user.friendshipStatus === FriendshipStatus.PENDING && (
                      <span className="absolute right-4 px-4 py-2 bg-hold-orange/20 text-hold-orange text-xs font-extrabold rounded-xl border-2 border-hold-orange/30">
                        {user.isRequester ? 'Envoyee' : 'En attente'}
                      </span>
                    )}
                    {user.friendshipStatus === FriendshipStatus.ACCEPTED && (
                      <span className="absolute right-4 px-4 py-2 bg-hold-green/20 text-hold-green text-xs font-extrabold rounded-xl border-2 border-hold-green/30">
                        Ami
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'requests' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-climb-dark/60 font-bold">Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 p-4 rounded-3xl bg-hold-orange/10 border-2 border-hold-orange shadow-neo"
                    style={{ boxShadow: '4px 4px 0px 0px #FF8C00' }}
                  >
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border-2 border-climb-dark rotate-3"
                      style={{ backgroundColor: getAvatarColor(request.user.name) }}
                    >
                      <span className="text-white font-extrabold text-lg -rotate-3">
                        {request.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-extrabold text-climb-dark">
                        {request.user.name}
                      </h3>
                      <p className="text-xs text-climb-dark/50 font-bold">{request.user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="w-10 h-10 rounded-xl bg-hold-green text-white border-2 border-climb-dark shadow-neo-sm flex items-center justify-center transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="w-10 h-10 rounded-xl bg-hold-pink text-white border-2 border-climb-dark shadow-neo-sm flex items-center justify-center transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <div className="neo-card p-8 inline-block">
                  <span className="material-symbols-outlined text-[48px] text-climb-dark/30 mb-4">
                    group_add
                  </span>
                  <p className="text-climb-dark/60 font-bold mb-4">Vous n'avez pas encore d'amis</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="btn-neo-primary"
                  >
                    Rechercher des amis
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friendship) => (
                  <div
                    key={friendship.id}
                    className="flex items-center gap-4 p-4 rounded-3xl bg-hold-green/10 border-2 border-hold-green shadow-neo"
                    style={{ boxShadow: '4px 4px 0px 0px #2ECC71' }}
                  >
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border-2 border-climb-dark -rotate-3"
                      style={{ backgroundColor: getAvatarColor(friendship.user.name) }}
                    >
                      <span className="text-white font-extrabold text-lg rotate-3">
                        {friendship.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-extrabold text-climb-dark">
                        {friendship.user.name}
                      </h3>
                      <p className="text-xs text-climb-dark/50 font-bold">{friendship.user.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friendship.id)}
                      className="w-10 h-10 rounded-xl text-hold-pink hover:bg-hold-pink/10 border-2 border-hold-pink/30 flex items-center justify-center transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">person_remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-hold-pink text-sm font-bold">{error}</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
