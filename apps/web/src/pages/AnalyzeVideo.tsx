import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { routesAPI, analysisAPI, Route } from '../lib/api';

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

export default function AnalyzeVideo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) loadRoute();
  }, [id]);

  const loadRoute = async () => {
    if (!id) return;
    try {
      const data = await routesAPI.getRouteById(id);
      setRoute(data);
    } catch (err: any) {
      setError(err.message || 'Route introuvable');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.type)) {
      setError('Format non supporté. Utilisez MP4, MOV ou WebM.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Fichier trop lourd (max 100 Mo).');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !id) return;
    try {
      setState('uploading');
      setUploadProgress(0);
      setError(null);

      const result = await analysisAPI.analyzeVideo(id, selectedFile, (pct) => {
        setUploadProgress(pct);
        if (pct === 100) setState('analyzing');
      });

      setState('done');
      setTimeout(() => navigate(`/analysis/${result.analysisId}`), 800);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'analyse");
      setState('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-hold-pink border-r-transparent" />
      </div>
    );
  }

  const isIdle = state === 'idle' || state === 'error';

  return (
    <div className="min-h-screen bg-cream">
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b-2 border-climb-dark">
        <div className="flex items-center gap-4 px-4 py-3 max-w-md mx-auto">
          <Link
            to={`/routes/${id}`}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-climb-dark shadow-neo"
          >
            <span className="material-symbols-outlined text-climb-dark">arrow_back</span>
          </Link>
          <div className="flex-1">
            <h1 className="font-extrabold text-climb-dark text-lg">Analyser ma grimpe</h1>
            {route && <p className="text-sm text-climb-dark/60 font-medium truncate">{route.name}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-12 space-y-5">
        {/* Route preview */}
        {route?.mainPhoto && (
          <div className="neo-card overflow-hidden p-0">
            <div className="relative w-full aspect-video">
              <img
                src={route.mainPhoto}
                alt={route.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-climb-dark/80 to-transparent flex items-end p-4">
                <div>
                  <p className="text-white font-extrabold text-lg">{route.name}</p>
                  <p className="text-white/70 text-sm font-medium">
                    {route.difficulty} · {route.sector}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload zone / progress / done */}
        {isIdle && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`neo-card p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                selectedFile ? 'bg-hold-green/10 border-hold-green' : 'bg-white hover:bg-cream'
              }`}
            >
              <span className="material-symbols-outlined text-[48px] text-climb-dark/40">
                {selectedFile ? 'check_circle' : 'video_file'}
              </span>
              {selectedFile ? (
                <div className="text-center">
                  <p className="font-bold text-climb-dark text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-climb-dark/60">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} Mo
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-bold text-climb-dark">Choisir une vidéo</p>
                  <p className="text-xs text-climb-dark/60">MP4, MOV ou WebM · Max 100 Mo</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <div className="neo-card bg-hold-pink/10 p-4">
                <p className="text-sm font-bold text-hold-pink flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </p>
              </div>
            )}

            {selectedFile && (
              <button onClick={handleSubmit} className="w-full btn-neo bg-hold-pink text-white">
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                  Analyser avec l'IA
                </span>
              </button>
            )}
          </div>
        )}

        {state === 'uploading' && (
          <div className="neo-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-hold-blue border-r-transparent shrink-0" />
              <div>
                <p className="font-bold text-climb-dark">Upload en cours...</p>
                <p className="text-xs text-climb-dark/60">{uploadProgress}%</p>
              </div>
            </div>
            <div className="w-full h-3 bg-climb-dark/10 rounded-full overflow-hidden border border-climb-dark/20">
              <div
                className="h-full bg-hold-blue rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {state === 'analyzing' && (
          <div className="neo-card p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-hold-pink/20 border-2 border-hold-pink">
              <span className="material-symbols-outlined text-hold-pink text-[32px]">psychology</span>
            </div>
            <div>
              <p className="font-extrabold text-climb-dark text-lg">Analyse IA en cours</p>
              <p className="text-sm text-climb-dark/60 mt-1">Claude analyse votre technique...</p>
            </div>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-hold-pink animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {state === 'done' && (
          <div className="neo-card p-8 text-center">
            <span className="material-symbols-outlined text-hold-green text-[48px]">check_circle</span>
            <p className="font-extrabold text-climb-dark text-lg mt-2">Analyse terminée !</p>
            <p className="text-sm text-climb-dark/60">Redirection...</p>
          </div>
        )}

        {/* Tips */}
        <div className="neo-card bg-hold-yellow/10 p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-hold-yellow text-[20px] mt-0.5">
              tips_and_updates
            </span>
            <div>
              <p className="text-sm font-bold text-climb-dark mb-1">Conseils pour une bonne vidéo</p>
              <ul className="text-xs text-climb-dark/70 space-y-1">
                <li>• Filmez depuis le côté pour voir les mouvements</li>
                <li>• Assurez-vous que le mur entier est visible</li>
                <li>• Bonne luminosité pour une meilleure analyse</li>
                <li>• Vidéo complète de la voie (départ → fin)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
