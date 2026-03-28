import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysisAPI, Analysis } from '../lib/api';
import { TopNav } from '../components/TopNav';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { PoseAnalysisPlayer } from '../components/PoseAnalysisPlayer';
import { PoseMetricsCharts } from '../components/PoseMetricsCharts';
import { usePoseMetrics } from '../hooks/usePoseMetrics';

function GlobalScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444';
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold" style={{ color }}>{score}</span>
          <span className="text-xs font-bold text-climb-dark/50">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-bold text-climb-dark/60">Score global</span>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-climb-dark/60 w-20 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-3 bg-climb-dark/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-extrabold text-climb-dark w-8 shrink-0 text-right">{value}</span>
    </div>
  );
}

const DIMENSIONS = [
  { key: 'fluidite', label: 'Fluidité', color: '#3B82F6' },
  { key: 'technique', label: 'Technique', color: '#8B5CF6' },
  { key: 'precision', label: 'Précision', color: '#EC4899' },
  { key: 'endurance', label: 'Endurance', color: '#F97316' },
  { key: 'creativite', label: 'Créativité', color: '#22C55E' },
] as const;

export default function AnalysisResults() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { frames, addFrame, reset } = usePoseMetrics();
  const [currentT, setCurrentT] = useState(0);

  const handleLandmarks = useCallback(
    (landmarks: NormalizedLandmark[], ts: number, videoTime: number) => {
      addFrame(landmarks, ts, videoTime);
      setCurrentT(videoTime);
    },
    [addFrame],
  );

  useEffect(() => {
    if (id) load();
  }, [id]);

  const load = async () => {
    if (!id) return;
    try {
      const data = await analysisAPI.getAnalysis(id);
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Analyse introuvable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-hold-pink border-r-transparent" />
          <p className="mt-4 text-climb-dark/60 font-bold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6">
        <div className="text-center">
          <p className="text-climb-dark font-bold mb-4">{error || 'Analyse introuvable'}</p>
          <Link to="/routes" className="btn-neo-primary">Retour aux voies</Link>
        </div>
      </div>
    );
  }

  const date = new Date(analysis.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md md:max-w-2xl mx-auto overflow-hidden md:overflow-visible bg-cream md:pt-16">
      <TopNav />
      <div className="sticky top-0 md:top-16 z-40 bg-cream/90 backdrop-blur-md border-b-2 border-climb-dark">
        <div className="flex items-center gap-4 px-4 pt-12 md:pt-4 py-3">
          {analysis.route && (
            <Link
              to={`/routes/${analysis.routeId}`}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-climb-dark shadow-neo"
            >
              <span className="material-symbols-outlined text-climb-dark">arrow_back</span>
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-climb-dark text-lg">Résultats d'analyse</h1>
            {analysis.route && (
              <p className="text-sm text-climb-dark/60 font-medium truncate">
                {analysis.route.name} · {date}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 pb-12 md:pb-6 space-y-5">
        {/* Route card */}
        {analysis.route && (
          <div className="neo-card overflow-hidden p-0">
            <div className="relative w-full h-28">
              <img
                src={analysis.route.mainPhoto}
                alt={analysis.route.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-climb-dark/80 to-transparent flex items-center p-4">
                <div>
                  <p className="text-white font-extrabold text-lg">{analysis.route.name}</p>
                  <p className="text-white/70 text-sm font-medium">{analysis.route.difficulty}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global score */}
        <div className="neo-card p-6 flex flex-col items-center">
          <GlobalScoreCircle score={Math.round(analysis.globalScore)} />
        </div>

        {/* Detail scores */}
        <div className="neo-card p-5 space-y-4">
          <h2 className="font-extrabold text-climb-dark">Scores détaillés</h2>
          <div className="space-y-3">
            {DIMENSIONS.map(dim => (
              <ScoreBar
                key={dim.key}
                label={dim.label}
                value={Math.round((analysis.detailScores as any)[dim.key] ?? 0)}
                color={dim.color}
              />
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 && (
          <div className="neo-card p-5 space-y-3">
            <h2 className="font-extrabold text-climb-dark flex items-center gap-2">
              <span className="material-symbols-outlined text-hold-orange text-[20px]">tips_and_updates</span>
              Points d'amélioration
            </h2>
            <ul className="space-y-2">
              {(analysis.suggestions as string[]).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-climb-dark/80">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-hold-orange/20 text-hold-orange font-bold text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Highlights */}
        {Array.isArray(analysis.highlights) && analysis.highlights.length > 0 && (
          <div className="neo-card p-5 space-y-3 bg-hold-green/10">
            <h2 className="font-extrabold text-climb-dark flex items-center gap-2">
              <span className="material-symbols-outlined text-hold-green text-[20px]">star</span>
              Points forts
            </h2>
            <ul className="space-y-2">
              {(analysis.highlights as string[]).map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-climb-dark/80">
                  <span className="material-symbols-outlined text-hold-green text-[16px] mt-0.5">check_circle</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.route && (
          <Link
            to={`/routes/${analysis.routeId}`}
            className="w-full btn-neo bg-white text-climb-dark flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Retour à la voie
          </Link>
        )}

        {analysis.video?.url && (
          <div className="neo-card p-5 space-y-3">
            <h2 className="font-extrabold text-climb-dark flex items-center gap-2">
              <span className="material-symbols-outlined text-hold-blue text-[20px]">accessibility</span>
              Analyse de mouvement
            </h2>
            <PoseAnalysisPlayer
              videoUrl={analysis.video.url}
              onLandmarks={handleLandmarks}
              onSeek={reset}
            />
            {frames.length === 0 && (
              <p className="text-sm text-climb-dark/50 text-center py-4">
                Lance la vidéo pour voir l'analyse de mouvement
              </p>
            )}
            {frames.length > 10 && (
              <PoseMetricsCharts frames={frames} currentT={currentT} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
