import { useState, useEffect } from 'react';
import { routesAPI, Route } from '../../lib/api';
import { getDifficultyColor } from '../../utils/gradeColors';

type RouteStatus = 'PENDING' | 'ACTIVE' | 'ARCHIVED';

export const AdminRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RouteStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadRoutes();
  }, [statusFilter]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = { limit: 100 };
      if (statusFilter !== 'ALL') {
        filters.status = statusFilter;
      } else {
        filters.status = ['PENDING', 'ACTIVE', 'ARCHIVED'];
      }
      const result = await routesAPI.getRoutes(filters);
      setRoutes(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (routeId: string, newStatus: RouteStatus) => {
    setUpdatingId(routeId);
    try {
      await routesAPI.updateRouteStatus(routeId, newStatus);
      await loadRoutes();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Supprimer cette voie ? Cette action est irreversible.')) return;

    setUpdatingId(routeId);
    try {
      await routesAPI.deleteRoute(routeId);
      await loadRoutes();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRoutes = routes.filter((route) =>
    route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-green text-white">
            ACTIVE
          </span>
        );
      case 'PENDING':
        return (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-yellow text-climb-dark">
            EN ATTENTE
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-climb-dark/30 text-climb-dark">
            ARCHIVEE
          </span>
        );
      default:
        return null;
    }
  };

  if (loading && routes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hold-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-climb-dark">Gestion des voies</h2>
        <span className="text-sm text-climb-dark/60 font-bold">{filteredRoutes.length} voies</span>
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
          placeholder="Rechercher une voie..."
          className="input-neo"
        />

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['ALL', 'PENDING', 'ACTIVE', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap border-2 transition-all ${
                statusFilter === status
                  ? 'bg-hold-orange text-white border-climb-dark'
                  : 'bg-white text-climb-dark/60 border-climb-dark/20 hover:border-climb-dark/40'
              }`}
            >
              {status === 'ALL' ? 'Toutes' : status === 'PENDING' ? 'En attente' : status === 'ACTIVE' ? 'Actives' : 'Archivees'}
            </button>
          ))}
        </div>
      </div>

      {/* Routes List */}
      {filteredRoutes.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-climb-dark/20 mb-4">route</span>
          <p className="text-climb-dark/60 font-bold">Aucune voie trouvee</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRoutes.map((route) => {
            const difficultyColor = getDifficultyColor(route.difficulty);
            const isUpdating = updatingId === route.id;

            return (
              <div
                key={route.id}
                className={`neo-card p-4 ${isUpdating ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Difficulty badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-climb-dark shrink-0"
                    style={{ backgroundColor: difficultyColor.hex }}
                  >
                    <span className="text-xs font-extrabold text-white drop-shadow">
                      {route.difficulty}
                    </span>
                  </div>

                  {/* Route info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-climb-dark truncate">{route.name}</h3>
                      {getStatusBadge(route.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-climb-dark/50">
                      <span className="bg-cream px-1.5 py-0.5 rounded border border-climb-dark/10">
                        {route.sector}
                      </span>
                      <span>
                        {new Date(route.openedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-climb-dark/10">
                  {route.status === 'PENDING' && (
                    <button
                      onClick={() => handleStatusChange(route.id, 'ACTIVE')}
                      disabled={isUpdating}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-hold-green text-white rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Activer
                    </button>
                  )}
                  {route.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusChange(route.id, 'ARCHIVED')}
                      disabled={isUpdating}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-climb-dark/20 text-climb-dark rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">archive</span>
                      Archiver
                    </button>
                  )}
                  {route.status === 'ARCHIVED' && (
                    <button
                      onClick={() => handleStatusChange(route.id, 'ACTIVE')}
                      disabled={isUpdating}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-hold-blue text-white rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">unarchive</span>
                      Reactiver
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(route.id)}
                    disabled={isUpdating}
                    className="p-2 text-hold-pink hover:bg-hold-pink/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
