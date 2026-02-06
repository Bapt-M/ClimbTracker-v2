import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type UserRole = 'CLIMBER' | 'OPENER' | 'ADMIN';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/users?limit=100`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data?.users || []);
      } else {
        throw new Error('Erreur lors du chargement');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise a jour du role');
      }

      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-orange text-white">
            ADMIN
          </span>
        );
      case 'OPENER':
        return (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-blue text-white">
            OUVREUR
          </span>
        );
      case 'CLIMBER':
        return (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-climb-dark/20 text-climb-dark">
            GRIMPEUR
          </span>
        );
      default:
        return null;
    }
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      '#FF2E63', '#08D9D6', '#2ECC71', '#a855f7',
      '#f97316', '#eab308', '#3b82f6', '#ec4899',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hold-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-climb-dark">Gestion des utilisateurs</h2>
        <span className="text-sm text-climb-dark/60 font-bold">{filteredUsers.length} utilisateurs</span>
      </div>

      {error && (
        <div className="bg-hold-pink/10 border-2 border-hold-pink/30 text-hold-pink px-4 py-3 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="space-y-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="input-neo"
        />

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['ALL', 'CLIMBER', 'OPENER', 'ADMIN'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap border-2 transition-all ${
                roleFilter === role
                  ? 'bg-hold-orange text-white border-climb-dark'
                  : 'bg-white text-climb-dark/60 border-climb-dark/20 hover:border-climb-dark/40'
              }`}
            >
              {role === 'ALL' ? 'Tous' : role === 'CLIMBER' ? 'Grimpeurs' : role === 'OPENER' ? 'Ouvreurs' : 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-climb-dark/20 mb-4">group</span>
          <p className="text-climb-dark/60 font-bold">Aucun utilisateur trouve</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isUpdating = updatingId === user.id;

            return (
              <div
                key={user.id}
                className={`neo-card p-4 ${isUpdating ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-climb-dark shrink-0"
                    style={{ backgroundColor: user.image ? undefined : getAvatarColor(user.name) }}
                  >
                    {user.image ? (
                      <img src={user.image} alt={user.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <span className="text-lg font-extrabold text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-climb-dark truncate">{user.name}</h3>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-xs text-climb-dark/50 truncate">{user.email}</p>
                    <p className="text-[10px] text-climb-dark/40 mt-1">
                      Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Role selector */}
                <div className="mt-3 pt-3 border-t border-climb-dark/10">
                  <label className="block text-[10px] font-extrabold text-climb-dark/50 uppercase tracking-wider mb-2">
                    Changer le role
                  </label>
                  <div className="flex gap-2">
                    {(['CLIMBER', 'OPENER', 'ADMIN'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(user.id, role)}
                        disabled={isUpdating || user.role === role}
                        className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-50 ${
                          user.role === role
                            ? role === 'ADMIN'
                              ? 'bg-hold-orange text-white'
                              : role === 'OPENER'
                              ? 'bg-hold-blue text-white'
                              : 'bg-climb-dark/20 text-climb-dark'
                            : 'bg-cream text-climb-dark/60 hover:bg-climb-dark/10'
                        }`}
                      >
                        {role === 'CLIMBER' ? 'Grimpeur' : role === 'OPENER' ? 'Ouvreur' : 'Admin'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
