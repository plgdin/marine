// ═══════════════════════════════════════════════════════════════
// HullDiagram — Top-down SVG vessel silhouette with annotated
// dimensions (LOA, beam, draught) for the vessel detail page.
// ═══════════════════════════════════════════════════════════════

import { formatNumber } from '@shared/utils/format';

interface HullDiagramProps {
  lengthM: number | null;
  beamM: number | null;
  draughtM: number | null;
  depthM: number | null;
  dimensionA: number | null;
  dimensionB: number | null;
  dimensionC: number | null;
  dimensionD: number | null;
}

export function HullDiagram({
  lengthM,
  beamM,
  draughtM,
  depthM,
  dimensionA,
  dimensionB,
  dimensionC,
  dimensionD,
}: HullDiagramProps) {
  const hasMainDims = lengthM != null || beamM != null;
  const hasOffsets = dimensionA != null || dimensionB != null || dimensionC != null || dimensionD != null;

  if (!hasMainDims && !hasOffsets) {
    return null;
  }

  // Viewbox constants
  const vw = 480;
  const vh = 280;
  const pad = 44;
  const hullW = vw - pad * 2; // available width for hull
  const hullH = vh - pad * 2; // available height for hull
  const bowTaper = hullH * 0.28; // how far the bow tapers
  const sternW = hullW * 0.06; // stern cut

  // Hull body polygon: top-down ship shape
  // Stern (left), port side (bottom), bow (right), starboard side (top)
  const cx = pad + hullW / 2;
  const cy = pad + hullH / 2;

  // Points defining the hull outline
  const sternLeft = { x: pad, y: cy - hullH * 0.35 };
  const sternRight = { x: pad, y: cy + hullH * 0.35 };
  const portStern = { x: pad + sternW, y: cy + hullH * 0.45 };
  const portMid = { x: cx, y: cy + hullH * 0.48 };
  const portBow = { x: pad + hullW * 0.78, y: cy + hullH * 0.35 };
  const bowTip = { x: pad + hullW, y: cy };
  const starStern = { x: pad + sternW, y: cy - hullH * 0.45 };
  const starMid = { x: cx, y: cy - hullH * 0.48 };
  const starBow = { x: pad + hullW * 0.78, y: cy - hullH * 0.35 };

  const hullPath = `
    M ${sternLeft.x} ${sternLeft.y}
    L ${starStern.x} ${starStern.y}
    Q ${cx * 0.5} ${cy - hullH * 0.5} ${starMid.x} ${starMid.y}
    Q ${pad + hullW * 0.65} ${cy - hullH * 0.46} ${starBow.x} ${starBow.y}
    Q ${pad + hullW * 0.92} ${cy - bowTaper * 0.6} ${bowTip.x} ${bowTip.y}
    Q ${pad + hullW * 0.92} ${cy + bowTaper * 0.6} ${portBow.x} ${portBow.y}
    Q ${pad + hullW * 0.65} ${cy + hullH * 0.46} ${portMid.x} ${portMid.y}
    Q ${cx * 0.5} ${cy + hullH * 0.5} ${portStern.x} ${portStern.y}
    L ${sternRight.x} ${sternRight.y}
    Z
  `;

  // Midship line
  const midX = cx;
  // AIS antenna position (roughly at dimension A from bow)
  const antX = hasOffsets && dimensionA != null && dimensionB != null
    ? pad + hullW * (1 - dimensionA / (dimensionA + dimensionB))
    : cx;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-overlay/20 p-4 overflow-hidden">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-3">
        Hull Plan View
      </div>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="w-full"
        style={{ maxHeight: 220 }}
        aria-label="Top-down vessel hull diagram"
      >
        <defs>
          <linearGradient id="hullGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(64,196,255,0.15)" />
            <stop offset="50%" stopColor="rgba(64,196,255,0.08)" />
            <stop offset="100%" stopColor="rgba(64,196,255,0.20)" />
          </linearGradient>
          <filter id="hullGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hull body */}
        <path
          d={hullPath}
          fill="url(#hullGrad)"
          stroke="rgba(64,196,255,0.5)"
          strokeWidth={1.5}
          filter="url(#hullGlow)"
        />

        {/* Midship line */}
        <line
          x1={midX} y1={cy - hullH * 0.52}
          x2={midX} y2={cy + hullH * 0.52}
          stroke="rgba(64,196,255,0.25)" strokeWidth={1} strokeDasharray="4 4"
        />

        {/* Centerline */}
        <line
          x1={pad - 6} y1={cy}
          x2={pad + hullW + 6} y2={cy}
          stroke="rgba(255,255,255,0.1)" strokeWidth={0.7} strokeDasharray="3 5"
        />

        {/* LOA annotation */}
        {lengthM != null && (
          <g>
            {/* Arrow line */}
            <line x1={pad} y1={vh - 16} x2={pad + hullW} y2={vh - 16}
              stroke="rgba(64,196,255,0.6)" strokeWidth={1} />
            <polygon points={`${pad},${vh - 16} ${pad + 6},${vh - 20} ${pad + 6},${vh - 12}`}
              fill="rgba(64,196,255,0.6)" />
            <polygon points={`${pad + hullW},${vh - 16} ${pad + hullW - 6},${vh - 20} ${pad + hullW - 6},${vh - 12}`}
              fill="rgba(64,196,255,0.6)" />
            <text x={cx} y={vh - 6} textAnchor="middle" fill="rgba(64,196,255,0.9)" fontSize={11} fontWeight={600}>
              LOA: {formatNumber(lengthM, 1)} m
            </text>
          </g>
        )}

        {/* Beam annotation */}
        {beamM != null && (
          <g>
            <line x1={vw - 16} y1={cy - hullH * 0.48} x2={vw - 16} y2={cy + hullH * 0.48}
              stroke="rgba(0,230,118,0.5)" strokeWidth={1} />
            <polygon points={`${vw - 16},${cy - hullH * 0.48} ${vw - 20},${cy - hullH * 0.48 + 6} ${vw - 12},${cy - hullH * 0.48 + 6}`}
              fill="rgba(0,230,118,0.5)" />
            <polygon points={`${vw - 16},${cy + hullH * 0.48} ${vw - 20},${cy + hullH * 0.48 - 6} ${vw - 12},${cy + hullH * 0.48 - 6}`}
              fill="rgba(0,230,118,0.5)" />
            <text x={vw - 6} y={cy + 4} textAnchor="middle" fill="rgba(0,230,118,0.8)" fontSize={10} fontWeight={600}
              transform={`rotate(-90 ${vw - 6} ${cy})`}>
              Beam: {formatNumber(beamM, 1)} m
            </text>
          </g>
        )}

        {/* AIS antenna marker */}
        {hasOffsets && (
          <g>
            <circle cx={antX} cy={cy} r={4} fill="rgba(255,171,0,0.8)" stroke="rgba(255,171,0,0.3)" strokeWidth={6} />
            <text x={antX} y={cy - 12} textAnchor="middle" fill="rgba(255,171,0,0.8)" fontSize={9} fontWeight={600}>
              AIS Ant.
            </text>
          </g>
        )}

        {/* Bow label */}
        <text x={pad + hullW + 4} y={cy - 8} fill="rgba(255,255,255,0.3)" fontSize={9} fontWeight={500}>
          BOW
        </text>

        {/* Stern label */}
        <text x={pad - 4} y={cy - 8} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9} fontWeight={500}>
          STERN
        </text>

        {/* Port / Starboard labels */}
        <text x={cx} y={pad + hullH + 10} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={8}>
          PORT
        </text>
        <text x={cx} y={pad - 4} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={8}>
          STARBOARD
        </text>
      </svg>

      {/* Side elevation for draught */}
      {(draughtM != null || depthM != null) && (
        <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
          {draughtM != null && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,23,68,0.7)' }} />
              <span>Draught: <span className="font-semibold text-text-primary">{formatNumber(draughtM, 1)} m</span></span>
            </div>
          )}
          {depthM != null && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(156,39,176,0.7)' }} />
              <span>Depth: <span className="font-semibold text-text-primary">{formatNumber(depthM, 1)} m</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
