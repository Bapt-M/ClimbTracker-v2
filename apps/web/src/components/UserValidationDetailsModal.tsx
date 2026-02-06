import { useState, useEffect } from 'react';
import { leaderboardAPI, UserValidationDetails } from '../lib/api';
import { getDifficultyColor } from '../utils/gradeColors';

interface UserValidationDetailsModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export const UserValidationDetailsModal = ({
  userId,
  userName,
  onClose,
}: UserValidationDetailsModalProps) => {
  const [details, setDetails] = useState<UserValidationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDetails();
  }, [userId]);

  const loadDetails = async () => {
    console.log('[UserValidationDetailsModal] Loading details for userId:', userId);
    try {
      setLoading(true);
      setError(null);
      const data = await leaderboardAPI.getUserValidationDetails(userId);
      console.log('[UserValidationDetailsModal] Received data:', data);
      setDetails(data);
    } catch (err: any) {
      console.error('[UserValidationDetailsModal] Error:', err);
      setError(err.message || 'Impossible de charger les details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-climb-dark/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-cream rounded-3xl border-2 border-climb-dark shadow-neo-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-cream border-b-2 border-climb-dark/20 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-climb-dark">
                Details du classement
              </h2>
              <p className="text-sm text-climb-dark/60 font-bold mt-1">{userName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white border-2 border-climb-dark hover:bg-hold-pink hover:text-white transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
              <p className="mt-4 text-climb-dark/60 font-bold">Chargement des details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-hold-pink font-bold mb-4">{error}</p>
              <button
                onClick={loadDetails}
                className="px-6 py-3 bg-climb-dark text-white rounded-xl font-extrabold border-2 border-climb-dark shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Reessayer
              </button>
            </div>
          ) : details ? (
            <>
              {/* Total Points */}
              <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-hold-pink to-hold-orange text-white border-2 border-climb-dark shadow-neo">
                <p className="text-sm font-extrabold uppercase tracking-wider opacity-90">
                  Score Total
                </p>
                <p className="text-4xl font-black mt-1">
                  {details.totalPoints.toLocaleString()} pts
                </p>
                <p className="text-xs opacity-75 mt-2 font-bold">
                  {details.validations.length} voies validees (6 derniers mois)
                </p>
              </div>

              {/* Formula Explanation */}
              <div className="mb-6 p-4 rounded-2xl bg-white border-2 border-climb-dark/20">
                <p className="text-xs font-extrabold text-climb-dark mb-2">
                  Formule de calcul :
                </p>
                <p className="text-xs text-climb-dark/70 font-bold">
                  Points = <span className="font-extrabold text-hold-purple">Grade de base</span> x{' '}
                  <span className="font-extrabold text-hold-blue">Difficulte de la voie</span> x{' '}
                  <span className="font-extrabold text-hold-green">Multiplicateur d'essais</span>
                </p>
              </div>

              {/* Validations List */}
              <div className="space-y-3">
                {details.validations.map((validation) => {
                  const difficultyColor = getDifficultyColor(validation.difficulty);

                  return (
                    <div
                      key={validation.routeId}
                      className="p-4 rounded-2xl bg-white border-2 border-climb-dark/20 hover:border-climb-dark/40 transition-colors"
                    >
                      {/* Route Info */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border-2 border-climb-dark"
                          style={{
                            backgroundColor: difficultyColor.hex,
                          }}
                        >
                          <span className="text-[10px] font-extrabold text-white drop-shadow">
                            {validation.difficulty.substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-extrabold text-climb-dark">
                            {validation.routeName}
                          </h3>
                          <p className="text-xs text-climb-dark/60 font-bold mt-0.5">
                            {validation.sector} -{' '}
                            {validation.isFlashed ? (
                              <span className="text-hold-yellow font-extrabold">Flash</span>
                            ) : (
                              `${validation.attempts} essai${validation.attempts > 1 ? 's' : ''}`
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-climb-dark">
                            {validation.totalPoints}
                          </p>
                          <p className="text-[9px] text-climb-dark/50 uppercase font-extrabold">pts</p>
                        </div>
                      </div>

                      {/* Calculation Details */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t-2 border-climb-dark/10">
                        <div className="text-center">
                          <p className="text-[9px] text-climb-dark/50 uppercase font-extrabold mb-1">
                            Grade de base
                          </p>
                          <p className="text-sm font-extrabold text-hold-purple">
                            {validation.basePoints}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-climb-dark/50 uppercase font-extrabold mb-1">
                            Diff. voie
                          </p>
                          <p className="text-sm font-extrabold text-hold-blue">
                            x{validation.routeDifficultyFactor}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-climb-dark/50 uppercase font-extrabold mb-1">
                            Essais
                          </p>
                          <p className="text-sm font-extrabold text-hold-green">
                            x{validation.attemptsMultiplier}
                          </p>
                        </div>
                      </div>

                      {/* Formula Result */}
                      <div className="mt-3 pt-3 border-t-2 border-climb-dark/10">
                        <p className="text-[10px] text-climb-dark/60 text-center font-bold">
                          {validation.basePoints} x {validation.routeDifficultyFactor} x{' '}
                          {validation.attemptsMultiplier} ={' '}
                          <span className="font-extrabold text-climb-dark">
                            {validation.totalPoints} points
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {details.validations.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-climb-dark/60 font-bold">Aucune validation dans les 6 derniers mois</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
