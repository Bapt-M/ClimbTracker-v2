import type { PoseFrame } from '../hooks/usePoseMetrics';

interface PoseMetricsChartsProps {
  frames: PoseFrame[];
  currentT: number; // video seconds
}

// ─── Layout constants (exported for tests) ───────────────────────────────────

export const TOTAL_W = 640;
export const LEFT_MARGIN = 40;
const RIGHT_MARGIN = 8;
const BOTTOM_MARGIN = 20;
export const PLOT_W = TOTAL_W - LEFT_MARGIN - RIGHT_MARGIN; // 592

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

export function xOfTime(videoTimeSec: number, maxVideoTime: number): number {
  if (maxVideoTime <= 0) return 0;
  return (videoTimeSec / maxVideoTime) * PLOT_W;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function polylinePoints(
  frames: PoseFrame[],
  getValue: (f: PoseFrame) => number,
  yMin: number,
  yMax: number,
  plotH: number,
  maxVideoTime: number,
): string {
  return frames
    .map(f => {
      const x = LEFT_MARGIN + xOfTime(f.videoTime, maxVideoTime);
      const y = plotH - ((getValue(f) - yMin) / (yMax - yMin)) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ─── Shared SVG sub-components ────────────────────────────────────────────────

function YAxis({
  ticks, yMin, yMax, plotH, labels,
}: {
  ticks: number[];
  yMin: number;
  yMax: number;
  plotH: number;
  labels?: string[];
}) {
  return (
    <>
      {/* Axis line */}
      <line x1={LEFT_MARGIN} y1={0} x2={LEFT_MARGIN} y2={plotH} stroke="#d1d5db" strokeWidth={1} />
      {ticks.map((tick, i) => {
        const y = plotH - ((tick - yMin) / (yMax - yMin)) * plotH;
        const label = labels ? labels[i] : String(tick);
        return (
          <g key={tick}>
            <line x1={LEFT_MARGIN} y1={y} x2={LEFT_MARGIN + PLOT_W} y2={y} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="3 3" />
            <text x={LEFT_MARGIN - 4} y={y + 4} fontSize={9} fill="#9ca3af" textAnchor="end">{label}</text>
          </g>
        );
      })}
    </>
  );
}

function XAxis({
  maxVideoTime,
  plotH,
}: {
  maxVideoTime: number;
  plotH: number;
}) {
  if (maxVideoTime <= 0) return null;
  const tickInterval = maxVideoTime <= 30 ? 5 : maxVideoTime <= 120 ? 10 : 30;
  const ticks: number[] = [];
  for (let t = 0; t <= maxVideoTime; t += tickInterval) {
    ticks.push(t);
  }
  return (
    <>
      {ticks.map(t => {
        const x = LEFT_MARGIN + xOfTime(t, maxVideoTime);
        return (
          <g key={t}>
            <line x1={x} y1={plotH} x2={x} y2={plotH + 4} stroke="#d1d5db" strokeWidth={1} />
            <text x={x} y={plotH + 14} fontSize={9} fill="#9ca3af" textAnchor="middle">{formatTime(t)}</text>
          </g>
        );
      })}
    </>
  );
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
  const PLOT_H = 160;
  const TOTAL_H = PLOT_H + BOTTOM_MARGIN;
  const maxVideoTime = frames.length > 0 ? frames[frames.length - 1].videoTime : 0;
  const cx = LEFT_MARGIN + xOfTime(currentT, maxVideoTime);

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Angles articulaires (°)</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {JOINT_LINES.map(l => (
          <span key={l.key} className="flex items-center gap-1 text-[10px] font-bold text-climb-dark/70">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full h-48" preserveAspectRatio="none">
        <YAxis ticks={[0, 45, 90, 135, 180]} yMin={0} yMax={180} plotH={PLOT_H} />
        <XAxis maxVideoTime={maxVideoTime} plotH={PLOT_H} />
        {JOINT_LINES.map(l => (
          <polyline
            key={l.key}
            points={polylinePoints(frames, f => f[l.key] as number, 0, 180, PLOT_H, maxVideoTime)}
            fill="none" stroke={l.color} strokeWidth={1.5} strokeLinejoin="round"
          />
        ))}
        <line x1={cx} y1={0} x2={cx} y2={PLOT_H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
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
  const PLOT_H = 100;
  const TOTAL_H = PLOT_H + BOTTOM_MARGIN;
  const maxVideoTime = frames.length > 0 ? frames[frames.length - 1].videoTime : 0;
  const cx = LEFT_MARGIN + xOfTime(currentT, maxVideoTime);
  const smooth = smoothCog(frames);

  const points = smooth
    .map((v, i) => `${(LEFT_MARGIN + xOfTime(frames[i].videoTime, maxVideoTime)).toFixed(1)},${(PLOT_H - v * PLOT_H).toFixed(1)}`)
    .join(' ');
  const fillPoints = `${LEFT_MARGIN},${PLOT_H} ${points} ${LEFT_MARGIN + PLOT_W},${PLOT_H}`;

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Centre de gravité</p>
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cogGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <YAxis
          ticks={[0, 0.5, 1]}
          yMin={0} yMax={1} plotH={PLOT_H}
          labels={['bas', '—', 'haut']}
        />
        <XAxis maxVideoTime={maxVideoTime} plotH={PLOT_H} />
        <polygon points={fillPoints} fill="url(#cogGrad)" />
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
        <line x1={cx} y1={0} x2={cx} y2={PLOT_H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

// ─── Chart 3: Équilibre bras ──────────────────────────────────────────────────

function ArmBalanceChart({ frames, currentT }: PoseMetricsChartsProps) {
  const PLOT_H = 100;
  const TOTAL_H = PLOT_H + BOTTOM_MARGIN;
  const maxVideoTime = frames.length > 0 ? frames[frames.length - 1].videoTime : 0;
  const cx = LEFT_MARGIN + xOfTime(currentT, maxVideoTime);

  // Zone rects: value 0 = bottom (y=PLOT_H), value 1 = top (y=0)
  const zoneTop    = { y: 0,            h: PLOT_H * 0.4, color: '#fb923c', label: 'D' };
  const zoneMiddle = { y: PLOT_H * 0.4, h: PLOT_H * 0.2, color: '#22c55e', label: 'éq' };
  const zoneBottom = { y: PLOT_H * 0.6, h: PLOT_H * 0.4, color: '#3b82f6', label: 'G' };

  const points = polylinePoints(frames, f => f.armBalance, 0, 1, PLOT_H, maxVideoTime);

  return (
    <div className="bg-white border-2 border-climb-dark shadow-neo rounded-2xl p-4 space-y-2">
      <p className="text-sm font-extrabold text-climb-dark">Équilibre bras</p>
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Color zones */}
        {[zoneTop, zoneMiddle, zoneBottom].map(z => (
          <rect key={z.label} x={LEFT_MARGIN} y={z.y} width={PLOT_W} height={z.h} fill={z.color} fillOpacity={0.08} />
        ))}
        <YAxis
          ticks={[0, 0.5, 1]}
          yMin={0} yMax={1} plotH={PLOT_H}
          labels={['G', 'éq', 'D']}
        />
        <XAxis maxVideoTime={maxVideoTime} plotH={PLOT_H} />
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinejoin="round" />
        <line x1={cx} y1={0} x2={cx} y2={PLOT_H} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
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
