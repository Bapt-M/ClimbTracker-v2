import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { routesAPI, validationsAPI, Route, Validation } from '../lib/api';
import { useSession, signOut } from '../lib/auth-client';
import { QuickStatusMenu, ValidationStatus } from '../components/QuickStatusMenu';
import { CommentList } from '../components/CommentList';
import { CommentForm } from '../components/CommentForm';
import { RouteCompletionCount } from '../components/RouteCompletionCount';
import { MiniGymLayout } from '../components/MiniGymLayout';
import { ImageViewer } from '../components/ImageViewer';
import { EditRouteModal } from '../components/EditRouteModal';
import { HoldColorIndicator } from '../components/HoldColorIndicator';
import { getDifficultyColor } from '../utils/gradeColors';
import { HoldOverlay } from '../components/HoldOverlay';
import { holdDetectionAPI, analysisAPI, Analysis } from '../lib/api';
import { DetectedHold } from '../lib/ai/hold-detection';
import { TopNav } from '../components/TopNav';

interface UserValidation {
  id: string;
  status: ValidationStatus;
  attempts: number;
  isFlashed: boolean;
  isFavorite: boolean;
}

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user;

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentRefresh, setCommentRefresh] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [userValidation, setUserValidation] = useState<UserValidation | null>(null);
  const [holdMapping, setHoldMapping] = useState<DetectedHold[] | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);

  useEffect(() => {
    if (id) {
      loadRoute();
      loadUserValidation();
      loadHoldMap();
      loadRecentAnalyses();
    }
  }, [id, user]);

  const loadRoute = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await routesAPI.getRouteById(id);
      setRoute(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  const loadUserValidation = async () => {
    if (!id || !user) return;

    try {
      const validations = await validationsAPI.getUserValidations();
      const validation = validations.find((v: Validation) => v.routeId === id);
      if (validation) {
        const isFlashed = validation.status === 'FLASHED';
        setUserValidation({
          id: validation.id,
          status: validation.status === 'FLASHED' || validation.status === 'COMPLETED'
            ? ValidationStatus.VALIDE
            : ValidationStatus.EN_PROJET,
          attempts: validation.attempts || 1,
          isFlashed,
          isFavorite: validation.isFavorite,
        });
      } else {
        setUserValidation(null);
      }
    } catch (err: any) {
      console.error('Failed to load user validation:', err);
    }
  };

  const loadHoldMap = async () => {
    if (!id) return;
    try {
      const holds = await holdDetectionAPI.getHoldMap(id);
      setHoldMapping(holds);
    } catch {
      // Hold map is optional — ignore errors
    }
  };

  const loadRecentAnalyses = async () => {
    if (!id) return;
    try {
      const data = await analysisAPI.getRouteAnalyses(id);
      setRecentAnalyses(data.slice(0, 3));
    } catch {
      // Analyses are optional — ignore errors
    }
  };

  const handleStatusChange = () => {
    loadRoute();
    loadUserValidation();
  };

  const handleDelete = async () => {
    if (!id || !confirm('Etes-vous sur de vouloir supprimer cette voie ?')) return;

    try {
      await routesAPI.deleteRoute(id);
      navigate('/routes');
    } catch (err: any) {
      alert(err.message || 'Failed to delete route');
    }
  };

  const handleRouteStatusChange = async (status: 'PENDING' | 'ACTIVE' | 'ARCHIVED') => {
    if (!id) return;

    try {
      await routesAPI.updateRouteStatus(id, status);
      // Reload full route data to get all relations
      await loadRoute();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
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

  if (error || !route) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-climb-dark font-bold mb-4">{error || 'Route not found'}</p>
          <Link
            to="/routes"
            className="btn-neo-primary"
          >
            Retour aux voies
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = user?.id === route.openerId || (user as any)?.role === 'ADMIN';
  const canDelete = (user as any)?.role === 'ADMIN';
  const canMapHolds = user?.id === route.openerId || (user as any)?.role === 'ADMIN';
  const canChangeStatus = (user as any)?.role === 'ADMIN';

  const difficultyColor = getDifficultyColor(route.difficulty);

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md md:max-w-none mx-auto overflow-hidden md:overflow-visible bg-cream md:pt-16">
      <TopNav />

      {/* Header */}
      <div className="sticky top-0 md:top-16 z-40 bg-cream/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 pt-12 md:pt-4">
          <Link
            to="/routes"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-climb-dark shadow-neo transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <span className="material-symbols-outlined text-climb-dark">arrow_back</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-climb-dark shadow-neo transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-28 md:overflow-visible md:pb-6">
        <div className="md:flex md:gap-8 md:items-start md:px-8 md:py-6">

          {/* Left column — photo + info */}
          <div className="md:w-1/2 min-w-0">
            {/* Hero Image */}
            <div
              className="relative w-full aspect-[4/3] bg-cream cursor-pointer group mx-4 mt-2 rounded-3xl overflow-hidden border-2 border-climb-dark shadow-neo md:mx-0"
              style={{ width: 'calc(100% - 2rem)' }}
              onClick={() => setIsViewerOpen(true)}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url(${route.mainPhoto})` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-climb-dark/90 via-climb-dark/20 to-transparent"></div>

              {/* Zoom indicator */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-climb-dark px-3 py-2 rounded-full flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity border-2 border-climb-dark">
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                <span className="text-xs font-bold">Agrandir</span>
              </div>

              {/* Hold Color Indicator */}
              {route.holdColorHex && (
                <div className="absolute top-4 left-4 pointer-events-none">
                  <HoldColorIndicator holdColorHex={route.holdColorHex} size={64} className="drop-shadow-xl" />
                </div>
              )}

              <div className="absolute bottom-0 left-0 w-full p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">
                    {route.name}
                  </h1>
                  <div className="rounded-xl border-2 border-white/50 bg-white/20 backdrop-blur-sm p-2">
                    <MiniGymLayout sector={route.sector} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm font-bold">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    {route.opener?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 py-6 grid grid-cols-3 gap-4">
              <div className="stats-card bg-white relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-10 h-10 rounded-bl-full opacity-20"
                  style={{ backgroundColor: difficultyColor.hex }}
                ></div>
                <span className="text-label mb-1">Grade</span>
                <span
                  className="text-2xl font-extrabold"
                  style={{ color: difficultyColor.hex }}
                >
                  {route.difficulty}
                </span>
              </div>

              <div className="stats-card bg-hold-blue/20">
                <span className="text-label mb-1">Validations</span>
                <span className="text-2xl font-extrabold text-climb-dark">
                  {route.validationsCount || 0}
                </span>
              </div>

              <div className="stats-card bg-hold-yellow/20">
                <span className="text-label mb-1">Commentaires</span>
                <span className="text-2xl font-extrabold text-climb-dark">
                  {route.commentsCount || 0}
                </span>
              </div>
            </div>

            {/* Main Info */}
            <div className="px-6 space-y-6">
              {/* Completion Count */}
              <div>
                <RouteCompletionCount routeId={route.id} />
              </div>

              {/* About */}
              {route.description && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-extrabold text-climb-dark">
                    A propos de cette voie
                  </h2>
                  <div className="neo-card p-5">
                    <p className="text-sm text-climb-dark/70 leading-relaxed font-medium">
                      {route.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Tips */}
              {route.tips && (
                <div className="neo-card bg-hold-blue/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-hold-blue text-[20px] fill-1">
                      tips_and_updates
                    </span>
                    <h3 className="text-sm font-extrabold text-hold-blue tracking-wide uppercase">
                      Conseils
                    </h3>
                  </div>
                  <p className="text-sm text-climb-dark/80 font-medium leading-relaxed">
                    {route.tips}
                  </p>
                </div>
              )}

              {/* Hold Mapping */}
              {holdMapping && holdMapping.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-climb-dark">Carte des prises</h2>
                    {canMapHolds && (
                      <Link
                        to={`/routes/${route.id}/holds`}
                        className="text-xs font-bold text-hold-blue flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Modifier
                      </Link>
                    )}
                  </div>
                  <HoldOverlay
                    imageUrl={route.mainPhoto}
                    holdColorHex={route.holdColorHex}
                    initialHolds={holdMapping}
                    readOnly={true}
                  />
                </div>
              )}

              {!holdMapping && canMapHolds && (
                <div className="neo-card bg-hold-blue/10 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-hold-blue text-[20px]">auto_awesome</span>
                    <span className="text-sm font-bold text-climb-dark">Mapper les prises</span>
                  </div>
                  <Link
                    to={`/routes/${route.id}/holds`}
                    className="px-3 py-1.5 bg-hold-blue text-white rounded-xl font-bold text-xs border-2 border-climb-dark shadow-neo-sm"
                  >
                    Démarrer
                  </Link>
                </div>
              )}

              {/* AI Analysis */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-climb-dark">Analyse IA</h2>
                  <Link
                    to={`/routes/${route.id}/analyze`}
                    className="px-3 py-1.5 bg-hold-pink text-white rounded-xl font-bold text-xs border-2 border-climb-dark shadow-neo-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">psychology</span>
                    Analyser
                  </Link>
                </div>
                {recentAnalyses.length > 0 ? (
                  <div className="space-y-2">
                    {recentAnalyses.map(analysis => (
                      <Link
                        key={analysis.id}
                        to={`/analysis/${analysis.id}`}
                        className="neo-card p-3 flex items-center justify-between gap-3 block"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl border-2 border-climb-dark flex items-center justify-center font-extrabold text-sm"
                            style={{
                              backgroundColor: analysis.globalScore >= 70 ? '#22C55E20' : '#F9740820',
                              color: analysis.globalScore >= 70 ? '#22C55E' : '#F97316',
                            }}
                          >
                            {Math.round(analysis.globalScore)}
                          </div>
                          <span className="text-xs text-climb-dark/60 font-medium">
                            {new Date(analysis.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-climb-dark/40 text-[16px]">
                          chevron_right
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="neo-card p-4 text-center">
                    <p className="text-sm text-climb-dark/60 font-medium">Aucune analyse pour l'instant</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — actions + social */}
          <div className="md:w-1/2 min-w-0">
            {/* Desktop-only action buttons */}
            {user && (
              <div className="hidden md:block mb-6 px-6 md:px-0">
                <div className="flex gap-3">
                  <button className="h-12 w-12 shrink-0 rounded-xl bg-cream text-climb-dark border-2 border-climb-dark shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">add_a_photo</span>
                  </button>
                  <button
                    onClick={() => setIsStatusMenuOpen(true)}
                    className={`flex-1 h-12 flex items-center justify-center gap-2 px-6 rounded-xl font-extrabold transition-all active:scale-95 border-2 border-climb-dark shadow-neo active:shadow-none active:translate-x-1 active:translate-y-1 ${
                      userValidation
                        ? userValidation.status === ValidationStatus.VALIDE
                          ? 'bg-hold-green text-white'
                          : 'bg-hold-orange text-white'
                        : 'bg-hold-pink text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] fill-1">
                      {userValidation
                        ? userValidation.isFavorite
                          ? 'favorite'
                          : userValidation.status === ValidationStatus.VALIDE
                          ? 'check_circle'
                          : 'schedule'
                        : 'add_circle'}
                    </span>
                    <span className="text-sm">
                      {userValidation
                        ? userValidation.status === ValidationStatus.VALIDE
                          ? userValidation.isFlashed
                            ? `Flash (${route.validationsCount || 0})`
                            : `Validee (${route.validationsCount || 0})`
                          : `En projet (${route.validationsCount || 0})`
                        : `Valider (${route.validationsCount || 0})`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            <div className="px-6 md:px-0 space-y-6">
              {(canEdit || canDelete || canChangeStatus) && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-extrabold text-climb-dark">
                    Actions Admin
                  </h2>
                  <div className="space-y-3">
                    {canChangeStatus && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRouteStatusChange('PENDING')}
                          className="flex-1 px-3 py-2 bg-white border-2 border-climb-dark text-climb-dark rounded-xl font-bold transition-all active:scale-95 text-sm shadow-neo-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => handleRouteStatusChange('ACTIVE')}
                          className="flex-1 px-3 py-2 bg-hold-green text-white border-2 border-climb-dark rounded-xl font-bold transition-all active:scale-95 text-sm shadow-neo-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Activer
                        </button>
                        <button
                          onClick={() => handleRouteStatusChange('ARCHIVED')}
                          className="flex-1 px-3 py-2 bg-white border-2 border-climb-dark text-climb-dark rounded-xl font-bold transition-all active:scale-95 text-sm shadow-neo-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Archiver
                        </button>
                      </div>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full btn-neo bg-climb-dark text-white"
                      >
                        Modifier
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        className="w-full btn-neo bg-hold-pink/10 border-hold-pink text-hold-pink"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-extrabold text-climb-dark">
                  Commentaires
                </h2>

                {/* Comment Form */}
                <div className="mb-2">
                  <CommentForm
                    routeId={route.id}
                    onCommentCreated={() => setCommentRefresh((prev) => prev + 1)}
                  />
                </div>

                {/* Comment List */}
                <CommentList routeId={route.id} refreshTrigger={commentRefresh} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Action Bar — mobile only */}
      {user && (
        <div className="fixed bottom-0 z-50 w-full max-w-md md:hidden bg-white border-t-4 border-climb-dark px-5 py-4">
          <div className="flex gap-3">
            <button className="h-12 w-12 shrink-0 rounded-xl bg-cream text-climb-dark border-2 border-climb-dark shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">add_a_photo</span>
            </button>
            <button
              onClick={() => setIsStatusMenuOpen(true)}
              className={`flex-1 h-12 flex items-center justify-center gap-2 px-6 rounded-xl font-extrabold transition-all active:scale-95 border-2 border-climb-dark shadow-neo active:shadow-none active:translate-x-1 active:translate-y-1 ${
                userValidation
                  ? userValidation.status === ValidationStatus.VALIDE
                    ? 'bg-hold-green text-white'
                    : 'bg-hold-orange text-white'
                  : 'bg-hold-pink text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] fill-1">
                {userValidation
                  ? userValidation.isFavorite
                    ? 'favorite'
                    : userValidation.status === ValidationStatus.VALIDE
                    ? 'check_circle'
                    : 'schedule'
                  : 'add_circle'}
              </span>
              <span className="text-sm">
                {userValidation
                  ? userValidation.status === ValidationStatus.VALIDE
                    ? userValidation.isFlashed
                      ? `Flash (${route.validationsCount || 0})`
                      : `Validee (${route.validationsCount || 0})`
                    : `En projet (${route.validationsCount || 0})`
                  : `Valider (${route.validationsCount || 0})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      <ImageViewer
        imageUrl={route.mainPhoto}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />

      {/* Edit Modal */}
      {route && (
        <EditRouteModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          route={route}
          onRouteUpdated={loadRoute}
        />
      )}

      {/* Quick Status Menu */}
      {isStatusMenuOpen && (
        <QuickStatusMenu
          routeId={route.id}
          routeName={route.name}
          currentValidation={userValidation || undefined}
          onClose={() => setIsStatusMenuOpen(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
