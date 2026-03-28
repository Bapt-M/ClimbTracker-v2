import type { PoseFrame } from '../hooks/usePoseMetrics';

interface PoseMetricsChartsProps {
  frames: PoseFrame[];
  currentT: number;
}

// ─── Shared SVG chart helpers ─────────────────────────────────────────────────

const W = 600;

function xOf(i: number, total: number): number {
  return total <= 1 ? 0 : (i / (total - 1)) * W;
}

function polylinePoints(
  frames: PoseFrame[],
  getValue: (f: PoseFrame) => number,
  yMin: number,
  yMax: number,
  h: number,
): string {
  return frames
    .map((f, i) => {
      const x = xOf(i, frames.length);
      const y = h - ((getValue(f) - yMin) / (yMax - yMin)) * h;
      return `${x},${y}`;
    })
    .join(' ');
}

function currentX(frames: PoseFrame[], currentT: number): number {
  if (frames.length < 2) return 0;
  const tMin = frames[0].t;
  const tMax = frames[frames.length - 1].t;
  if (tMax === tMin) return 0;
  return Math.max(0, Math.min(W, ((currentT - tMin) / (tMax - tMin)) * W));
}

// ─── Chart 1: Joint angles ────────────────────────────────────────────────────

const JOINT_LINES: { key: keyof PoseFrame; label: string; color: string }[] = [
  { key: 'elbowL', label: 'Coude G', color: '#06b6d4' },
  { key: 'elbowR', label: 'Coude D', color: '#0891b2' },
  { key: 'kneeL',  label: 'Genou G', color: '#22c55e' },
  { key: 'kneeR',  label: 'Genou D', color: '#15803d' },
  { key: 'hipL',   label: 'Hanche G', color: '#fb923c' },
  { key: 'hipR',   label: 'Hanche D', color: '#c2410c' },
];

function JointAnglesChart({ frames, currentT }: PoseMetricsChartsProps) {
  const H = 160;
  const cx = currentX(frames, currentT);

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Angles articulaires</p>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {JOINT_LINES.map(l => (
          <span key={l.key} className="flex items-center gap-1 text-[10px] font-bold text-climb-dark/70">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" preserveAspectRatio="none">
        {[0, 90, 180].map(deg => (
          <line
            key={deg}
            x1={0} y1={H - (deg / 180) * H}
            x2={W} y2={H - (deg / 180) * H}
            stroke="#e5e7eb" strokeWidth={1}
          />
        ))}

        {JOINT_LINES.map(l => (
          <polyline
            key={l.key}
            points={polylinePoints(frames, f => f[l.key] as number, 0, 180, H)}
            fill="none"
            stroke={l.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}

        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Chart 2: Centre de gravité ───────────────────────────────────────────────

function smoothCog(frames: PoseFrame[]): number[] {
  return frames.map((_, i) => {
    const start = Math.max(0, i - 2);
    const end = Math.min(frames.length - 1, i + 2);
    const slice = frames.slice(start, end + 1);
    return slice.reduce((s, f) => s + f.cog, 0) / slice.length;
  });
}

function CogChart({ frames, currentT }: PoseMetricsChartsProps) {
  const H = 100;
  const smooth = smoothCog(frames);
  const cx = currentX(frames, currentT);

  const points = smooth
    .map((v, i) => `${xOf(i, smooth.length)},${H - v * H}`)
    .join(' ');

  const fillPoints = `0,${H} ${points} ${W},${H}`;

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Centre de gravité</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cogGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#cogGrad)" />
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Chart 3: Balance bras/jambes ─────────────────────────────────────────────

function ArmBalanceChart({ frames, currentT }: PoseMetricsChartsProps) {
  const H = 100;
  const cx = currentX(frames, currentT);
  const points = frames
    .map((f, i) => `${xOf(i, frames.length)},${H - f.armBalance * H}`)
    .join(' ');

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Balance bras / jambes</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Zones */}
        <rect x={0} y={0} width={W} height={H * 0.4} fill="#22c55e" fillOpacity={0.08} />
        <rect x={0} y={H * 0.4} width={W} height={H * 0.2} fill="#6b7280" fillOpacity={0.06} />
        <rect x={0} y={H * 0.6} width={W} height={H * 0.4} fill="#ef4444" fillOpacity={0.08} />

        {/* Zone labels */}
        <text x={4} y={12} fontSize={8} fill="#15803d" fontWeight="bold">Bonnes jambes</text>
        <text x={4} y={H - 4} fontSize={8} fill="#b91c1c" fontWeight="bold">Sur-utilisation bras</text>

        {/* Curve */}
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinejoin="round" />

        {/* Current position */}
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────────

export function PoseMetricsCharts({ frames, currentT }: PoseMetricsChartsProps) {
  return (
    <div className="space-y-4 mt-4">
      <JointAnglesChart frames={frames} currentT={currentT} />
      <CogChart frames={frames} currentT={currentT} />
      <ArmBalanceChart frames={frames} currentT={currentT} />
    </div>
  );
}
