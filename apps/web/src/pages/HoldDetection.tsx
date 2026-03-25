import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { routesAPI, holdDetectionAPI, Route } from '../lib/api';
import { useSession } from '../lib/auth-client';
import { TopNav } from '../components/TopNav';
import { HoldOverlay } from '../components/HoldOverlay';
import { DetectedHold } from '../lib/ai/hold-detection';

export default function HoldDetection() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [route, setRoute] = useState<Route | null>(null);
  const [initialHolds, setInitialHolds] = useState<DetectedHold[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [routeData, holdData] = await Promise.all([
        routesAPI.getRouteById(id),
        holdDetectionAPI.getHoldMap(id).catch(() => null),
      ]);
      setRoute(routeData);
      if (holdData) setInitialHolds(holdData);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (holds: DetectedHold[]) => {
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      await holdDetectionAPI.saveHoldMap(id, holds);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = route && (user?.id === route.openerId || user?.role === 'ADMIN');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-blue border-r-transparent" />
          <p className="mt-4 text-climb-dark/60 font-bold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !route) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6">
        <div className="text-center">
          <p className="text-climb-dark font-bold mb-4">{error}</p>
          <Link to="/routes" className="btn-neo-primary">Retour aux voies</Link>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6">
        <div className="text-center">
          <p className="text-climb-dark font-bold mb-4">Accès non autorisé</p>
          <Link to={`/routes/${id}`} className="btn-neo-primary">Retour à la voie</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md md:max-w-2xl mx-auto overflow-hidden md:overflow-visible bg-cream md:pt-16">
      <TopNav />
      <div className="sticky top-0 md:top-16 z-40 bg-cream/90 backdrop-blur-md border-b-2 border-climb-dark">
        <div className="flex items-center gap-4 px-4 pt-12 md:pt-4 py-3">
          <Link
            to={`/routes/${id}`}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-climb-dark shadow-neo"
          >
            <span className="material-symbols-outlined text-climb-dark">arrow_back</span>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-climb-dark text-lg truncate">Mapper les prises</h1>
            {route && <p className="text-sm text-climb-dark/60 font-medium truncate">{route.name}</p>}
          </div>
          {saveSuccess && (
            <span className="text-hold-green font-bold text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Sauvegardé
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 pb-8 md:pb-6 space-y-4">
        <div className="neo-card bg-hold-blue/10 p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-hold-blue text-[20px] mt-0.5">info</span>
            <div>
              <p className="text-sm font-bold text-climb-dark mb-1">Comment ça marche</p>
              <p className="text-xs text-climb-dark/70 leading-relaxed">
                Cliquez sur <strong>Détecter automatiquement</strong> pour identifier les prises
                de couleur{' '}
                {route && (
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-climb-dark/20 align-middle mx-0.5"
                    style={{ backgroundColor: route.holdColorHex }}
                  />
                )}{' '}
                sur la photo. Ajustez manuellement si besoin, puis sauvegardez.
              </p>
            </div>
          </div>
        </div>

        {saving && (
          <div className="neo-card bg-hold-green/10 p-3 flex items-center gap-2">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-hold-green border-r-transparent" />
            <span className="text-sm font-bold text-hold-green">Sauvegarde...</span>
          </div>
        )}

        {error && (
          <div className="neo-card bg-hold-pink/10 p-3">
            <p className="text-sm font-bold text-hold-pink">{error}</p>
          </div>
        )}

        {route && (
          <HoldOverlay
            imageUrl={route.mainPhoto}
            holdColorHex={route.holdColorHex}
            initialHolds={initialHolds}
            onSave={handleSave}
            readOnly={false}
          />
        )}
      </div>
    </div>
  );
}
