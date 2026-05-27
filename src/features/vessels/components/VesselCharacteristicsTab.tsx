// ═══════════════════════════════════════════════════════════════
// VesselCharacteristicsTab — Full vessel specs, hull dimensions,
// tonnage, construction, propulsion, classification, and visual
// hull diagram.  Merges AIS + GFW data into one rich view.
// ═══════════════════════════════════════════════════════════════

import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Anchor,
  Building2,
  Cog,
  Flag,
  Fuel,
  Hash,
  Ruler,
  Scale,
  Ship,
  Wrench,
} from 'lucide-react';

import type { VesselMetadata } from '@shared/services/aisstream.service';
import type { GfwVesselIdentity } from '@shared/services/gfw.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { formatLabel, formatMMSI, formatNumber } from '@shared/utils/format';
import { buildVesselSpecs, type VesselSpecs } from '../utils/vessel-specs';
import { HullDiagram } from './HullDiagram';

// ── Helpers ──────────────────────────────────────────────────

function safeText(v: unknown): string {
  if (v == null) return '—';
  const s = String(v).trim();
  return s.length ? s : '—';
}

function dim(v: number | null, unit = 'm', decimals = 1): string {
  if (v == null) return '—';
  return `${formatNumber(v, decimals)} ${unit}`;
}

function ton(v: number | null, suffix = ''): string {
  if (v == null) return '—';
  return `${formatNumber(v, 0)}${suffix ? ` ${suffix}` : ''}`;
}

// ── Spec Row ─────────────────────────────────────────────────

function SpecRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-overlay/30 p-3 transition-colors hover:bg-surface-overlay/50">
      {icon && <div className="mt-0.5 shrink-0 text-accent-cyan">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-text-primary">{value}</div>
      </div>
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────

function Section({
  title,
  description,
  icon,
  children,
  glass,
  delay = 0,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  glass?: boolean;
  delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card glass={glass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-accent-cyan">{icon}</span>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────

interface VesselCharacteristicsTabProps {
  vesselId: string;
  aisMeta: VesselMetadata | undefined;
  gfwVessel: GfwVesselIdentity | null;
  gfwLoading: boolean;
}

export function VesselCharacteristicsTab({
  vesselId,
  aisMeta,
  gfwVessel,
  gfwLoading,
}: VesselCharacteristicsTabProps) {
  const specs = useMemo(() => buildVesselSpecs(aisMeta, gfwVessel), [aisMeta, gfwVessel]);

  if (gfwLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Hull Plan View (SVG) ────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <HullDiagram
          lengthM={specs.lengthOverallM}
          beamM={specs.beamM}
          draughtM={specs.draughtM}
          depthM={specs.depthM}
          dimensionA={specs.dimensionA}
          dimensionB={specs.dimensionB}
          dimensionC={specs.dimensionC}
          dimensionD={specs.dimensionD}
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Hull & Dimensions ──────────────────────────────── */}
        <Section
          title="Hull & Dimensions"
          description="Physical hull measurements from AIS static data and registry records."
          icon={<Ruler size={18} />}
          delay={0.05}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SpecRow label="Length overall (LOA)" value={dim(specs.lengthOverallM)} icon={<Ruler size={14} />} />
            <SpecRow label="Beam (breadth)" value={dim(specs.beamM)} icon={<Ruler size={14} />} />
            <SpecRow label="Depth" value={dim(specs.depthM)} icon={<Ruler size={14} />} />
            <SpecRow label="Draught (static)" value={dim(specs.draughtM)} icon={<Anchor size={14} />} />
            <SpecRow label="Hull material" value={safeText(specs.hullMaterial)} icon={<Wrench size={14} />} />
            <SpecRow label="AIS ship type code" value={specs.shipTypeCode != null ? String(specs.shipTypeCode) : '—'} icon={<Hash size={14} />} />
          </div>

          {/* AIS dimension offsets */}
          <div className="mt-4 rounded-xl border border-border-subtle bg-surface-overlay/20 p-4 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              AIS Antenna Dimension Offsets (m)
            </div>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map((k) => {
                const val = specs[`dimension${k}` as keyof VesselSpecs] as number | null;
                return (
                  <div key={k}>
                    <div className="text-[11px] text-text-tertiary">
                      {k === 'A' ? 'A (bow)' : k === 'B' ? 'B (stern)' : k === 'C' ? 'C (port)' : 'D (stbd)'}
                    </div>
                    <div className="font-semibold text-text-primary">
                      {val != null ? formatNumber(val, 0) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-text-tertiary">
              LOA = A + B &nbsp;|&nbsp; Beam = C + D
            </div>
          </div>
        </Section>

        {/* ── Tonnage & Capacity ─────────────────────────────── */}
        <Section
          title="Tonnage & Capacity"
          description="Gross tonnage, net tonnage, deadweight, and displacement values."
          icon={<Scale size={18} />}
          delay={0.1}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SpecRow label="Gross tonnage (GT)" value={ton(specs.grossTonnage, 'GT')} icon={<Scale size={14} />} />
            <SpecRow label="Net tonnage (NT)" value={ton(specs.netTonnage, 'NT')} icon={<Scale size={14} />} />
            <SpecRow label="Deadweight (DWT)" value={ton(specs.deadweight, 'DWT')} icon={<Scale size={14} />} />
            <SpecRow label="Displacement" value={ton(specs.displacement, 't')} icon={<Scale size={14} />} />
          </div>

          {/* Tonnage bar visualization */}
          {specs.grossTonnage != null && (
            <div className="mt-4 rounded-xl border border-border-subtle bg-surface-overlay/20 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-3">
                Tonnage comparison
              </div>
              <TonnageBar label="Gross" value={specs.grossTonnage} max={Math.max(specs.grossTonnage ?? 0, specs.deadweight ?? 0, specs.displacement ?? 0)} color="rgba(64,196,255,0.6)" />
              {specs.netTonnage != null && (
                <TonnageBar label="Net" value={specs.netTonnage} max={Math.max(specs.grossTonnage ?? 0, specs.deadweight ?? 0, specs.displacement ?? 0)} color="rgba(0,230,118,0.5)" />
              )}
              {specs.deadweight != null && (
                <TonnageBar label="DWT" value={specs.deadweight} max={Math.max(specs.grossTonnage ?? 0, specs.deadweight ?? 0, specs.displacement ?? 0)} color="rgba(255,171,0,0.5)" />
              )}
              {specs.displacement != null && (
                <TonnageBar label="Disp." value={specs.displacement} max={Math.max(specs.grossTonnage ?? 0, specs.deadweight ?? 0, specs.displacement ?? 0)} color="rgba(156,39,176,0.5)" />
              )}
            </div>
          )}
        </Section>

        {/* ── Construction & Build ──────────────────────────── */}
        <Section
          title="Construction"
          description="Shipyard, build year, hull number, and construction details."
          icon={<Building2 size={18} />}
          delay={0.15}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SpecRow label="Year built" value={specs.yearBuilt != null ? String(specs.yearBuilt) : '—'} icon={<Hash size={14} />} />
            <SpecRow label="Builder / Shipyard" value={safeText(specs.builder)} icon={<Building2 size={14} />} />
            <SpecRow label="Build country" value={safeText(specs.buildCountry)} icon={<Flag size={14} />} />
            <SpecRow label="Hull number" value={safeText(specs.hullNumber)} icon={<Hash size={14} />} />
          </div>

          {specs.yearBuilt != null && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-overlay/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-text-tertiary">Age</div>
              <Badge variant={vesselAge(specs.yearBuilt) > 25 ? 'warning' : vesselAge(specs.yearBuilt) > 15 ? 'neutral' : 'success'}>
                {vesselAge(specs.yearBuilt)} years
              </Badge>
            </div>
          )}
        </Section>

        {/* ── Propulsion & Machinery ────────────────────────── */}
        <Section
          title="Propulsion & Machinery"
          description="Engine type, power output, fuel type, and speed capabilities."
          icon={<Cog size={18} />}
          delay={0.2}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SpecRow label="Engine type" value={safeText(specs.engineType)} icon={<Cog size={14} />} />
            <SpecRow
              label="Engine power"
              value={
                specs.enginePowerKw != null
                  ? `${formatNumber(specs.enginePowerKw, 0)} kW`
                  : specs.enginePowerHp != null
                    ? `${formatNumber(specs.enginePowerHp, 0)} HP`
                    : '—'
              }
              icon={<Cog size={14} />}
            />
            <SpecRow label="Fuel type" value={safeText(specs.fuelType)} icon={<Fuel size={14} />} />
            <SpecRow
              label="Max speed"
              value={specs.maxSpeedKnots != null ? `${formatNumber(specs.maxSpeedKnots, 1)} kn` : '—'}
              icon={<Ship size={14} />}
            />
            <SpecRow
              label="Service speed"
              value={specs.serviceSpeedKnots != null ? `${formatNumber(specs.serviceSpeedKnots, 1)} kn` : '—'}
              icon={<Ship size={14} />}
            />
          </div>
        </Section>

        {/* ── Classification & Registry ─────────────────────── */}
        <Section
          title="Classification & Registry"
          description="Flag state, class society, port of registry, and vessel type classification."
          icon={<Flag size={18} />}
          delay={0.25}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SpecRow label="Flag state" value={safeText(specs.flag)} icon={<Flag size={14} />} />
            <SpecRow label="Class society" value={safeText(specs.classSociety)} icon={<Building2 size={14} />} />
            <SpecRow label="Port of registry" value={safeText(specs.portOfRegistry)} icon={<Anchor size={14} />} />
            <SpecRow label="Vessel type" value={safeText(specs.vesselTypeName ? formatLabel(specs.vesselTypeName) : null)} icon={<Ship size={14} />} />
          </div>

          {specs.gearTypes.length > 0 && (
            <div className="mt-4 rounded-xl border border-border-subtle bg-surface-overlay/20 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-2">
                Gear types
              </div>
              <div className="flex flex-wrap gap-1.5">
                {specs.gearTypes.map((g) => (
                  <Badge key={g} variant="info" size="sm">
                    {formatLabel(g)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {specs.registrySources.length > 0 && (
            <div className="mt-3 rounded-xl border border-border-subtle bg-surface-overlay/20 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-2">
                Registry sources
              </div>
              <div className="flex flex-wrap gap-1.5">
                {specs.registrySources.map((s) => (
                  <Badge key={s} variant="neutral" size="sm">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ── Identifiers ───────────────────────────────────── */}
        <Section
          title="Identifiers"
          description="Unique identification numbers from AIS and international registries."
          icon={<Hash size={18} />}
          delay={0.3}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SpecRow label="MMSI" value={formatMMSI(vesselId)} icon={<Hash size={14} />} />
            <SpecRow label="IMO" value={safeText(specs.imo)} icon={<Hash size={14} />} />
            <SpecRow label="Call sign" value={safeText(specs.callSign)} icon={<Hash size={14} />} />
            <SpecRow label="Destination (AIS)" value={safeText(specs.destination)} icon={<Ship size={14} />} />
          </div>
        </Section>

        {/* ── Ownership (quick view) ────────────────────────── */}
        {(specs.owner || specs.operator) && (
          <Section
            title="Ownership (Registry)"
            description="Owner and operator from registry records."
            icon={<Building2 size={18} />}
            delay={0.35}
          >
            <div className="grid grid-cols-1 gap-3 text-sm">
              {specs.owner && <SpecRow label="Registered owner" value={specs.owner} icon={<Building2 size={14} />} />}
              {specs.operator && <SpecRow label="Operator" value={specs.operator} icon={<Building2 size={14} />} />}
            </div>
          </Section>
        )}
      </div>

      {/* ── Data freshness footer ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-border-subtle bg-surface-overlay/10 p-3 text-xs text-text-tertiary"
      >
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {specs.lastStaticUpdateIso && (
            <span>AIS static last updated: <span className="text-text-secondary">{specs.lastStaticUpdateIso}</span></span>
          )}
          {specs.transmissionDateFrom && (
            <span>Transmission range: <span className="text-text-secondary">{specs.transmissionDateFrom} → {specs.transmissionDateTo ?? 'present'}</span></span>
          )}
          <span>Sources: AIS Stream{gfwVessel ? ', Global Fishing Watch' : ''}</span>
        </div>
      </motion.div>
    </div>
  );
}

// ── Tonnage Bar Sub-Component ────────────────────────────────

function TonnageBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="flex items-center gap-3 mb-2 last:mb-0">
      <div className="w-10 text-[10px] text-text-tertiary text-right font-medium">{label}</div>
      <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          className="h-full rounded-lg flex items-center px-2"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <span className="text-[10px] font-semibold text-white whitespace-nowrap">
            {formatNumber(value, 0)}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

// ── Utilities ────────────────────────────────────────────────

function vesselAge(yearBuilt: number): number {
  return new Date().getFullYear() - yearBuilt;
}
